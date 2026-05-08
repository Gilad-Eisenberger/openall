import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api', { exclude: ['redirect/*splat'] });
    app.useWebSocketAdapter(new WsAdapter(app));
    app.use(express.json({ limit: '50mb', }));

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
