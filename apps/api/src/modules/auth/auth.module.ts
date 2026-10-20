import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import {
  RefreshSession,
  RefreshSessionSchema,
} from './schemas/refresh-session.schema';
import {
  DeviceToken,
  DeviceTokenSchema,
} from './schemas/device-token.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { RefreshSessionRepository } from './repositories/refresh-session.repository';
import { DeviceTokenRepository } from './repositories/device-token.repository';
import { CounterRepository } from './repositories/counter.repository';
import { AuthService } from './auth.service';
import {
  AuthController,
  MeController,
  OrgController,
} from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ||
          'super-secret-jwt-key-for-rental-management-system-32chars',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [AuthController, MeController, OrgController],
  providers: [
    UserRepository,
    MembershipRepository,
    RefreshSessionRepository,
    DeviceTokenRepository,
    CounterRepository,
    AuthService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    UserRepository,
    MembershipRepository,
    RefreshSessionRepository,
    DeviceTokenRepository,
    CounterRepository,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
