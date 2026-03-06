import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentPlayer } from '../common/decorators/player.decorator';
import { type JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(private readonly players: PlayerService) {}

  @Get('me')
  async getMyProfile(@CurrentPlayer() player: JwtPayload) {
    return this.players.getProfile(player.sub);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.players.getProfile(id);
  }
}