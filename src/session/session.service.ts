import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SignerClientService } from '../signer-client/signer-client.service';
import { ethers } from 'ethers';

const SOUL_SESSION_KEY = (sessionId: string) => `soul:session:${sessionId}`;
const SESSION_TTL = 60 * 60 * 6; // 6 hours max session

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly signer: SignerClientService,
  ) {}

  async startSession(playerId: string, gameId: number, modeId: number) {
    // Abandon any existing active session
    const active = await this.prisma.session.findFirst({
      where: { playerId, status: 'ACTIVE' },
    });
    if (active) {
      await this.prisma.session.update({
        where: { id: active.id },
        data: { status: 'ABANDONED', endedAt: new Date() },
      });
      await this.redis.del(SOUL_SESSION_KEY(active.id));
    }

    const session = await this.prisma.session.create({
      data: { playerId, gameId, modeId },
    });

    await this.redis.set(SOUL_SESSION_KEY(session.id), '0', SESSION_TTL);
    this.logger.log(`Session started: ${session.id} for player ${playerId}`);
    return session;
  }

async earnSoul(sessionId: string, amount: string) {
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundException('Session not found');
  if (session.status !== 'ACTIVE') throw new BadRequestException('Session not active');

  const key = SOUL_SESSION_KEY(sessionId);
  const newBalance = await this.redis.incrbyfloat(key, parseFloat(amount));
  return { sessionSoulBalance: newBalance };
}

  async endSession(sessionId: string, playerId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.playerId !== playerId) throw new BadRequestException('Not your session');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session not active');

    const key = SOUL_SESSION_KEY(sessionId);
    const rawBalance = await this.redis.get(key);
    const soulEarned = rawBalance ?? '0';

    // Settle to Postgres
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date(), soulEarned },
    });

    // Update player soul balance
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    const currentBalance = BigInt(player?.soulBalance ?? '0');
    const earned = ethers.parseEther(soulEarned);
    const newBalance = (currentBalance + earned).toString();

    await this.prisma.player.update({
      where: { id: playerId },
      data: { soulBalance: newBalance },
    });

    // Queue SOUL mint via signer
    await this.signer.queueSoulMint({
      playerId,
      amount: earned.toString(),
    });

    // Clean up Redis
    await this.redis.del(key);

    this.logger.log(`Session ${sessionId} ended. SOUL earned: ${soulEarned}`);
    return { sessionId, soulEarned, newBalance };
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}