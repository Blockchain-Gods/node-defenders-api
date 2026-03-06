import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SignerClientModule } from './signer-client/signer-client.module';
import { AuthModule } from './auth/auth.module';
import { PlayerModule } from './player/player.module';
import { SessionModule } from './session/session.module';
import { SoulModule } from './soul/soul.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { ChainModule } from './chain/chain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    SignerClientModule,
    AuthModule,
    PlayerModule,
    SessionModule,
    SoulModule,
    LeaderboardModule,
    MarketplaceModule,
    ChainModule,
  ],
})
export class AppModule {}