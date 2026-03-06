import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignerClientService } from '../signer-client/signer-client.service';

@Injectable()
export class SoulService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: SignerClientService,
  ) {}

  async getBalance(playerId: string): Promise<{ balance: string }> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { soulBalance: true },
    });
    return { balance: player?.soulBalance ?? '0' };
  }
}