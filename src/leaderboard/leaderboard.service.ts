import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SubmitStatsDto {
  gameId: number;
  modeId: number;
  score: number;
  gamesPlayed: number;
  roundsSurvived: number;
  enemiesKilled: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(gameId: number, modeId: number, limit = 100) {
    return this.prisma.leaderboardEntry.findMany({
      where: { gameId, modeId },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        player: { select: { walletAddress: true } },
      },
    });
  }

  async submitStats(playerId: string, dto: SubmitStatsDto) {
    return this.prisma.leaderboardEntry.upsert({
      where: {
        playerId_gameId_modeId: {
          playerId,
          gameId: dto.gameId,
          modeId: dto.modeId,
        },
      },
      update: {
        score: { increment: dto.score },
        gamesPlayed: { increment: dto.gamesPlayed },
        roundsSurvived: { increment: dto.roundsSurvived },
        enemiesKilled: { increment: dto.enemiesKilled },
      },
      create: {
        playerId,
        gameId: dto.gameId,
        modeId: dto.modeId,
        score: dto.score,
        gamesPlayed: dto.gamesPlayed,
        roundsSurvived: dto.roundsSurvived,
        enemiesKilled: dto.enemiesKilled,
      },
    });
  }
}