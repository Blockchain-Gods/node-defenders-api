import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentPlayer } from '../common/decorators/player.decorator';
import { type JwtPayload } from '../common/guards/jwt-auth.guard';

class StartSessionDto {
  gameId: number;
  modeId: number;
}

class EarnSoulDto {
  sessionId: string;
  amount: string;
}

class EndSessionDto {
  sessionId: string;
}

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Post('start')
  async start(
    @Body() body: StartSessionDto,
    @CurrentPlayer() player: JwtPayload,
  ) {
    return this.sessions.startSession(player.sub, body.gameId, body.modeId);
  }

  @Post('earn')
  async earn(@Body() body: EarnSoulDto) {
    return this.sessions.earnSoul(body.sessionId, body.amount);
  }

  @Post('end')
  async end(@Body() body: EndSessionDto, @CurrentPlayer() player: JwtPayload) {
    return this.sessions.endSession(body.sessionId, player.sub);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.sessions.getSession(id);
  }
}