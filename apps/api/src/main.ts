import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];

  const isWildcard = allowedOrigins.includes('*');

  app.enableCors({
    origin: isWildcard
      ? '*'
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          // Allow requests with no origin (mobile apps, Postman, server-to-server)
          if (!origin) return callback(null, true);
          // Allow if explicitly listed in CORS_ORIGINS
          if (allowedOrigins.includes(origin)) return callback(null, true);
          // Allow any *.curex24.com subdomain (admin, doctor, app, etc.)
          if (/^https:\/\/([a-z0-9-]+\.)*curex24\.com$/.test(origin))
            return callback(null, true);
          callback(new Error('Not allowed by CORS'));
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
    credentials: !isWildcard,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Curex24 API')
    .setDescription('Curex24 backend REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Curex24 API running on port ${port}`);
}

bootstrap();
