import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`API running on port ${port}`);
}

bootstrap();