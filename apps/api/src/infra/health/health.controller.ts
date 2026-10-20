import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { RedisService } from '../redis/redis.service';
import { Public } from '../../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for MongoDB and Redis' })
  @ApiResponse({ status: 200, description: 'Application dependencies are healthy' })
  async getReadiness(@Res() res: Response) {
    const mongoReady = this.connection.readyState === 1; // 1 = connected
    let redisReady = false;

    try {
      const client = this.redisService.getClient();
      if (client) {
        const ping = await client.ping();
        redisReady = ping === 'PONG';
      }
    } catch {
      redisReady = false;
    }

    const isHealthy = mongoReady; // Core database is strictly required

    const payload = {
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        mongodb: mongoReady ? 'connected' : 'disconnected',
        redis: redisReady ? 'ready' : 'degraded',
      },
      timestamp: new Date().toISOString(),
    };

    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(payload);
  }
}
