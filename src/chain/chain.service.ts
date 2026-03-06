import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { MarketplaceService } from '../marketplace/marketplace.service';

import fujiDeployment from '../../deployments/fuji.json';

// Copy types from contracts repo into src/types/ (same as signer)
import { SoulToken__factory } from '../types/ethers-contracts/factories/SoulToken__factory';
import { UpgradeNFT__factory } from '../types/ethers-contracts/factories/UpgradeNFT.sol/UpgradeNFT__factory';
import { Marketplace__factory } from '../types/ethers-contracts/factories/Marketplace.sol/Marketplace__factory';

@Injectable()
export class ChainService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ChainService.name);
  private provider: ethers.WebSocketProvider;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly marketplace: MarketplaceService,
  ) {}

  async onApplicationBootstrap() {
    await this.connect();
  }

  async onApplicationShutdown() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.provider?.destroy();
  }

  private async connect() {
    const wssUrl = this.config.get<string>('blockchain.fujiWssUrl')!;
    const { contracts } = fujiDeployment;

    try {
      this.provider = new ethers.WebSocketProvider(wssUrl);

      this.provider.on('error', () => {
         this.logger.warn('WebSocket disconnected — reconnecting in 5s');
         this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

      await this.registerListeners(contracts);
      this.logger.log('Chain event listeners active');
    } catch (err) {
      this.logger.error('WebSocket connection failed — retrying in 5s', err);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

 private async registerListeners(contracts: typeof fujiDeployment.contracts) {
  const soulToken = SoulToken__factory.connect(contracts.SoulToken, this.provider);
  const upgradeNFT = UpgradeNFT__factory.connect(contracts.UpgradeNFT, this.provider);

  // SOUL BatchMinted — audit log
  soulToken.on(soulToken.filters.BatchMinted(), (recipients, amounts, totalMinted) => {
    this.logger.log(`BatchMinted: ${recipients.length} recipients, total: ${totalMinted}`);
  });

  // UpgradeNFT Transfer (mint) — on-chain confirmation
  upgradeNFT.on(
    upgradeNFT.filters.Transfer(ethers.ZeroAddress),
    async (_from, to, tokenId) => {
      this.logger.log(`UpgradeNFT minted: tokenId ${tokenId} to ${to}`);
    },
  );

  // Note: ERC-4907 rental expiry is time-based, no on-chain event emitted.
  // Expired rentals are checked via UpgradeNFT.userOf() returning zero address.
  // A cron job to sweep expired rentals can be added post-beta.
}

  // Read-only RPC helpers
  async getSoulBalance(walletAddress: string): Promise<string> {
    const { contracts } = fujiDeployment;
    const provider = new ethers.JsonRpcProvider(
      this.config.get<string>('blockchain.fujiRpcUrl'),
    );
    const soulToken = SoulToken__factory.connect(contracts.SoulToken, provider);
    const balance = await soulToken.balanceOf(walletAddress);
    return balance.toString();
  }
}