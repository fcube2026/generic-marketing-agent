import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  // Swagger / OpenAPI documentation
  const openapiPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'docs',
    'openapi',
    'openapi.yaml',
  );
  if (fs.existsSync(openapiPath)) {
    const openapiDocument = yaml.load(
      fs.readFileSync(openapiPath, 'utf8'),
    ) as OpenAPIObject;
    SwaggerModule.setup('swagger', app, openapiDocument);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Curex24 API running on port ${port}`);
}

bootstrap();
