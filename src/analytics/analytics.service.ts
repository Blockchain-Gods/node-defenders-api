import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export interface PlayerAnalytics {
  ipAddress: string | null;
  userAgent: string | null;
}

@Injectable()
export class AnalyticsService {
  extract(req: Request): PlayerAnalytics {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
      : (req.ip ?? null);

    const userAgent = req.headers['user-agent'] ?? null;

    return { ipAddress, userAgent };
  }
}