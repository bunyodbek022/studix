import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { config } from './common/config/swagger';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
    app.use(cookieParser())
    app.use('/uploads', express.static('uploads'));

    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.setGlobalPrefix('api/v1')
    const documentFactory = () => SwaggerModule.createDocument(app, config)

    SwaggerModule.setup('api/v1', app, documentFactory, {
        swaggerOptions: {
            withCredentials: true,
            filter: true,
            persistAuthorization: true,
            displayRequestDuration: true,
        },
    });

    const uploadsPath = join(process.cwd(), 'uploads');

    app.useStaticAssets(uploadsPath, {
        prefix: '/uploads/',
    });

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
