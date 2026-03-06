import { Module } from '@nestjs/common';
import { SoulService } from './soul.service';
import { SoulController } from './soul.controller';

@Module({
  providers: [SoulService],
  controllers: [SoulController],
})
export class SoulModule {}