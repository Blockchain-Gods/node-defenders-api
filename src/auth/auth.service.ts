import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'crypto';
import * as jose from 'jose';
import { SiweMessage } from 'siwe';
import { PlayerService } from '../player/player.service';

export interface LoginDto {
  type: 'web3auth' | 'siwe';
  // web3auth
  idToken?: string;
  // siwe
  message?: string;
  signature?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly players: PlayerService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; playerId: string; wallet: string }> {
    let walletAddress: string;
    let web3AuthId: string | undefined;

    if (dto.type === 'web3auth') {
      if (!dto.idToken) throw new UnauthorizedException('idToken required');
      const verified = await this.verifyWeb3AuthToken(dto.idToken);
      walletAddress = verified.walletAddress.toLowerCase();
      web3AuthId = verified.sub;
    } else {
      if (!dto.message || !dto.signature) {
        throw new UnauthorizedException('message and signature required');
      }
      walletAddress = await this.verifySiwe(dto.message, dto.signature);
    }

    const player = await this.players.findOrCreate(walletAddress, web3AuthId);

    const token = this.jwt.sign(
      { sub: player.id, wallet: player.walletAddress },
      { secret: this.config.get<string>('jwt.secret') },
    );

    return { token, playerId: player.id, wallet: player.walletAddress };
  }

  private async verifyWeb3AuthToken(
    idToken: string,
  ): Promise<{ sub: string; walletAddress: string }> {
    const jwksUrl = this.config.get<string>('web3Auth.jwksUrl')!;
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

    try {
      const { payload } = await jose.jwtVerify(idToken, JWKS);
      const walletAddress = (payload.wallets as any[])?.[0]?.public_key;
      if (!walletAddress) throw new Error('No wallet in Web3Auth token');
      return { sub: payload.sub!, walletAddress };
    } catch (err) {
      this.logger.error('Web3Auth token verification failed', err);
      throw new UnauthorizedException('Invalid Web3Auth token');
    }
  }

  private async verifySiwe(message: string, signature: string): Promise<string> {
    try {
      const siweMessage = new SiweMessage(message);
      const result = await siweMessage.verify({ signature });
      if (!result.success) throw new Error('SIWE verification failed');
      return result.data.address.toLowerCase();
    } catch (err) {
      this.logger.error('SIWE verification failed', err);
      throw new UnauthorizedException('Invalid SIWE signature');
    }
  }
}