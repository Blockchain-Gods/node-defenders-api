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

  soulToken.on(soulToken.filters.BatchMinted(), (recipients, _amounts, totalMinted) => {
    this.logger.log(`BatchMinted: ${recipients.length} recipients, total: ${totalMinted}`);
  });

  upgradeNFT.on(
    upgradeNFT.filters.Transfer(ethers.ZeroAddress),
    async (_from, to, tokenId) => {
      this.logger.log(`UpgradeNFT minted: tokenId ${tokenId} to ${to}`);
    },
  );

  // Sync marketplace listings from chain on every reconnect
  await this.syncMarketplaceListings();
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

 private async syncMarketplaceListings() {
  const { contracts } = fujiDeployment;
  const upgradeNFT = UpgradeNFT__factory.connect(contracts.UpgradeNFT, this.provider);
  const marketplace = Marketplace__factory.connect(contracts.Marketplace, this.provider);

  const totalTypes = await upgradeNFT.totalUpgradeTypes();

  const items: Array<{
    typeId: number;
    name: string;
    metadataURI: string;
    rarity: number;
    gameId: number;
    buyPriceSoul: string;
    buyPriceGods: string;
  }> = [];

  for (let typeId = 1n; typeId <= totalTypes; typeId++) {
    const upgradeType = await upgradeNFT.upgradeTypes(typeId);
    const price = await marketplace.prices(typeId);

    if (!upgradeType.active || !price.listed) continue;

    items.push({
      typeId: Number(typeId),
      name: upgradeType.name,
      metadataURI: upgradeType.metadataURI,
      rarity: Number(upgradeType.rarity),
      gameId: Number(upgradeType.gameId),
      buyPriceSoul: price.buyPriceSoul.toString(),
      buyPriceGods: price.buyPriceGods.toString(),
    });
  }

  await this.marketplace.syncListings(items);
  this.logger.log(`Synced ${items.length} marketplace listings from chain`);
}
}