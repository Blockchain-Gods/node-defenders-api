import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PlayerModule } from '../player/player.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') as any},
      }),
    }),
    PlayerModule,
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}