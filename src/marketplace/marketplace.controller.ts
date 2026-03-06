import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentPlayer } from '../common/decorators/player.decorator';
import { type JwtPayload } from '../common/guards/jwt-auth.guard';

class BuyDto {
  typeId: number;
  paymentToken: 'SOUL' | 'GODS';
}

class RentDto {
  typeId: number;
  tierId: number;
  paymentToken: 'SOUL' | 'GODS';
}

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('listings')
  async getListings() {
    return this.marketplace.getListings();
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  async buy(@Body() body: BuyDto, @CurrentPlayer() player: JwtPayload) {
    return this.marketplace.buy(player.sub, body.typeId, body.paymentToken);
  }

  @Post('rent')
  @UseGuards(JwtAuthGuard)
  async rent(@Body() body: RentDto, @CurrentPlayer() player: JwtPayload) {
    return this.marketplace.rent(player.sub, body.typeId, body.tierId, body.paymentToken);
  }
}