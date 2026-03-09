import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

app.enableCors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
    const isAllowed =
      !origin ||
      allowed.includes(origin) ||
      /^https:\/\/[a-z0-9]+\.node-defenders-frontend\.pages\.dev$/.test(origin);
    callback(null, isAllowed);
  },
  credentials: true,
});

  await app.listen(process.env.PORT ?? 3000);
  new Logger('Bootstrap').log(`API running on port ${process.env.PORT ?? 3001}`);
}

bootstrap();