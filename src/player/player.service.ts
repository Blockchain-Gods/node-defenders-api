import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignerClientService } from '../signer-client/signer-client.service';
import { Player } from 'src/generated/prisma/client';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: SignerClientService,
  ) {}

async createGuest(): Promise<{ player: Player; welcomeTokenId?: string }> {
  const placeholder = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const player = await this.prisma.player.create({
    data: {
      walletAddress: placeholder,
      isGuest: true,
      soulBalance: '0',
      godsBalance: '0',
    },
  });

  const { address: custodialAddress, welcomeTokenId } = await this.signer.createWallet(player.id);

  const updated = await this.prisma.player.update({
    where: { id: player.id },
    data: { walletAddress: custodialAddress },
  });

  if (welcomeTokenId) {
    await this.prisma.playerNFT.create({
      data: {
        playerId: player.id,
        tokenId: welcomeTokenId,
        typeId: 6,
        isRented: false,
      },
    });
    this.logger.log(`Welcome NFT recorded for guest ${updated.id}, tokenId: ${welcomeTokenId}`);
  }

  this.logger.log(`Guest player created: ${updated.id}`);
  return { player: updated, welcomeTokenId };
}

async findOrCreate(walletAddress: string, web3AuthId?: string) {
  const existing = await this.prisma.player.findUnique({
    where: { walletAddress },
  });
  if (existing) return existing;

  // Create player first to get UUID
  const player = await this.prisma.player.create({
    data: { walletAddress, web3AuthId, soulBalance: '0', godsBalance: '0' },
  });

  // Create custodial wallet — signer returns the on-chain address
const { address: custodialAddress, welcomeTokenId } = await this.signer.createWallet(player.id);

if (welcomeTokenId) {
  await this.prisma.playerNFT.create({
    data: {
      playerId: player.id,
      tokenId: welcomeTokenId,
      typeId: 6,
      isRented: false,
    },
  });
}
  // Update player record with the actual custodial wallet address
  const updated = await this.prisma.player.update({
    where: { id: player.id },
    data: { walletAddress: custodialAddress },
  });

  this.logger.log(`Player created: ${player.id}, custodial wallet: ${custodialAddress}`);
  return updated;
}

  async getProfile(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        leaderboard: true,
        nfts: true,
        achievements: true,
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  async updateSoulBalance(playerId: string, newBalance: string) {
    return this.prisma.player.update({
      where: { id: playerId },
      data: { soulBalance: newBalance },
    });
  }
}