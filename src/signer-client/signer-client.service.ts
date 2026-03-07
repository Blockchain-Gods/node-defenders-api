import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface MintSoulParams {
  playerId: string;
  amount: string;
}

export interface MintSbtParams {
  playerId: string;
  typeId: number;
}

export interface BatchStatsEntry {
  wallet: string;
  games: number;
  rounds: number;
  enemies: number;
}

export interface MarketplaceExecuteParams {
  playerId: string;
  action: 'buy' | 'rent';
  typeId: number;
  tierId?: number;
  paymentToken: 'SOUL' | 'GODS';
}

@Injectable()
export class SignerClientService {
  private readonly logger = new Logger(SignerClientService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('signer.baseUrl')!;
    const apiKey = this.config.get<string>('internalApiKey')!;

    this.http = axios.create({
      baseURL,
      headers: { 'X-Internal-Key': apiKey },
      timeout: 30000,
    });
  }

async createWallet(playerId: string): Promise<{ address: string; welcomeTokenId?: string }> {
  const { data } = await this.http.post('/wallet/create', { playerId });
  return data;
}

  async mintSoulNow(params: MintSoulParams): Promise<{ txHash: string }> {
    const { data } = await this.http.post('/mint/soul/now', params);
    return data;
  }

  async queueSoulMint(params: MintSoulParams): Promise<void> {
    await this.http.post('/mint/soul/queue', params);
  }

  async mintSbt(params: MintSbtParams): Promise<{ txHash: string }> {
    const { data } = await this.http.post('/mint/sbt', params);
    return data;
  }

  async recordBatchStats(entries: BatchStatsEntry[]): Promise<{ hashes: string[] }> {
    const { data } = await this.http.post('/stats/batch', { entries });
    return data;
  }

  async marketplaceExecute(
    params: MarketplaceExecuteParams,
  ): Promise<{ txHash: string; tokenId: string }> {
    const { data } = await this.http.post('/marketplace/execute', params);
    return data;
  }
}