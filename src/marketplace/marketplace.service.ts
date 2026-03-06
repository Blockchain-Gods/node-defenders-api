import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignerClientService } from '../signer-client/signer-client.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: SignerClientService,
  ) {}

  async getListings() {
    return this.prisma.marketplaceListing.findMany({
      where: { listed: true },
      include: { item: true },
    });
  }

  async buy(playerId: string, typeId: number, paymentToken: 'SOUL' | 'GODS') {
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { item: { typeId }, listed: true },
      include: { item: true },
    });
    if (!listing) throw new NotFoundException(`typeId ${typeId} not listed`);

    const result = await this.signer.marketplaceExecute({
      playerId,
      action: 'buy',
      typeId,
      paymentToken,
    });

    // Record NFT ownership
    await this.prisma.playerNFT.create({
      data: {
        playerId,
        tokenId: result.tokenId,
        typeId,
        isRented: false,
      },
    });

    // Deduct SOUL from player balance if paid with SOUL
    if (paymentToken === 'SOUL') {
      const player = await this.prisma.player.findUnique({ where: { id: playerId } });
      const current = BigInt(player?.soulBalance ?? '0');
      const cost = BigInt(listing.buyPriceSoul);
      await this.prisma.player.update({
        where: { id: playerId },
        data: { soulBalance: (current - cost).toString() },
      });
    }

    this.logger.log(`Player ${playerId} bought typeId ${typeId}. tx: ${result.txHash}`);
    return result;
  }

  async rent(
    playerId: string,
    typeId: number,
    tierId: number,
    paymentToken: 'SOUL' | 'GODS',
  ) {
    const result = await this.signer.marketplaceExecute({
      playerId,
      action: 'rent',
      typeId,
      tierId,
      paymentToken,
    });

    await this.prisma.playerNFT.create({
      data: {
        playerId,
        tokenId: result.tokenId,
        typeId,
        isRented: true,
      },
    });

    this.logger.log(`Player ${playerId} rented typeId ${typeId}. tx: ${result.txHash}`);
    return result;
  }

  async syncListings(
    items: Array<{
      typeId: number;
      name: string;
      metadataURI: string;
      rarity: number;
      gameId: number;
      buyPriceSoul: string;
      buyPriceGods: string;
    }>,
  ) {
    for (const item of items) {
      const existing = await this.prisma.marketplaceItem.upsert({
        where: { typeId: item.typeId },
        update: { name: item.name, metadataURI: item.metadataURI, active: true },
        create: {
          typeId: item.typeId,
          name: item.name,
          metadataURI: item.metadataURI,
          rarity: item.rarity,
          gameId: item.gameId,
        },
      });

      await this.prisma.marketplaceListing.upsert({
        where: { itemId: existing.id },
        update: { buyPriceSoul: item.buyPriceSoul, buyPriceGods: item.buyPriceGods, listed: true },
        create: {
          itemId: existing.id,
          buyPriceSoul: item.buyPriceSoul,
          buyPriceGods: item.buyPriceGods,
        },
      });
    }
  }
}