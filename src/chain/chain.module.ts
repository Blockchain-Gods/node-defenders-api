import { Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { ChainController } from './chain.controller';

@Module({
  imports: [MarketplaceModule],
  providers: [ChainService],
  controllers: [ChainController],
  exports: [ChainService],
})
export class ChainModule {}