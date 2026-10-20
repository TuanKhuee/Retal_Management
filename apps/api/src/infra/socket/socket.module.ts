import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeGateway } from './socket.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ||
          'super-secret-jwt-key-for-rental-management-system-32chars',
      }),
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class SocketModule {}
