import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD');

    try {
      this.client = new Redis({
        host,
        port: Number(port),
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('error', (err) => {
        // Handled: Suppress unhandled EventEmitter crash when operating in degraded mode without Redis
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Redis connection failed: ${err.message}. Operating in degraded mode.`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis init failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return this.client ? await this.client.get(key) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.client) return;
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Degraded cache fallback
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.client) await this.client.del(key);
    } catch {
      // Degraded cache fallback
    }
  }
}
