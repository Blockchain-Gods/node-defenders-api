import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService,type LoginDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

@Post('guest')
async guest() {
  return this.auth.loginAsGuest();
}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

@Post('dev/token')
async devToken() {
  if (process.env.NODE_ENV === 'production') {
    throw new UnauthorizedException('Not available in production');
  }
  // Generate a placeholder — will be replaced with custodial address
const placeholder = `custodial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const player = await this.auth['players'].findOrCreate(placeholder);
  const token = this.auth['jwt'].sign(
    { sub: player.id, wallet: player.walletAddress },
    { secret: this.auth['config'].get<string>('jwt.secret') },
  );
  return { token, playerId: player.id, wallet: player.walletAddress };
}

}
