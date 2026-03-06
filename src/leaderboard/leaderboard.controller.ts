import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService, type SubmitStatsDto } from './leaderboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentPlayer } from '../common/decorators/player.decorator';
import { type JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get(':gameId/:modeId')
  async get(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Param('modeId', ParseIntPipe) modeId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.leaderboard.getLeaderboard(gameId, modeId, limit);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submit(
    @Body() body: SubmitStatsDto,
    @CurrentPlayer() player: JwtPayload,
  ) {
    return this.leaderboard.submitStats(player.sub, body);
  }
}