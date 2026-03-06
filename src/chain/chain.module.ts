import { Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [MarketplaceModule],
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}