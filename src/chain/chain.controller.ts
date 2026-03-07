// src/chain/chain.controller.ts
import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainService } from './chain.service';

@Controller('admin/chain')
export class ChainController {
  constructor(
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {}

  @Post('sync-listings')
  async syncListings(@Headers('x-internal-key') key: string) {

    if (key !== this.config.get<string>('internalApiKey')) {
      throw new UnauthorizedException();
    }
    await this.chain.syncMarketplaceListings();
    return { ok: true };
  }
}