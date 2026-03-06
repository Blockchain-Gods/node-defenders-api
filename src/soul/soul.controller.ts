import { Controller, Get, UseGuards } from '@nestjs/common';
import { SoulService } from './soul.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentPlayer } from '../common/decorators/player.decorator';
import {type JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('soul')
@UseGuards(JwtAuthGuard)
export class SoulController {
  constructor(private readonly soul: SoulService) {}

  @Get('balance')
  async getBalance(@CurrentPlayer() player: JwtPayload) {
    return this.soul.getBalance(player.sub);
  }
}