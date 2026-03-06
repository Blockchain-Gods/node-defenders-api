import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('redis.url')!;
    this.client = new Redis(url, { lazyConnect: true });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.logger.log('Redis client initialised');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async incrbyfloat(key: string, amount: number): Promise<string> {
    return this.client.incrbyfloat(key, amount);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}