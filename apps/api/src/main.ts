import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Disable NestJS's automatic body-parser registration so we can configure
  // the limits ourselves.  The default 100 kb JSON limit is too small for
  // base64-encoded face-selfie payloads (typically 200 KB – 2 MB).
  // We re-implement the rawBody capture that would normally come from
  // `rawBody: true` so that the pharmacy webhook HMAC verification keeps
  // working (it reads `req.rawBody` as a Buffer).
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // 10 MB JSON body limit — large enough for base64 selfie images.
  // The `verify` callback stores the raw bytes so pharmacy webhooks can
  // validate the HMAC signature against the original unmodified body.
  app.use(
    json({
      limit: '10mb',
      verify: (req: Request & { rawBody?: Buffer }, _res, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Error handler for body-parser errors (e.g., malformed JSON, payload too large).
  // Must come AFTER the body parsers to catch their errors.
  // All body-parser errors carry an HTTP `status` code; handling them here
  // ensures the client always receives a well-formed JSON response instead of
  // an empty connection-close (which happens when Express's default finalhandler
  // tries to write a response after headers are already partially flushed).
  app.use(
    (err: any, req: Request, res: Response, next: (err?: any) => void) => {
      // Malformed JSON — body-parser sets both `SyntaxError` type and a `body`
      // property containing the raw input that failed to parse.
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid JSON in request body',
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      // Other body-parser errors: 413 Payload Too Large, 415 Unsupported Media
      // Type, etc.  body-parser stamps these with a numeric `status` field.
      if (typeof err.status === 'number') {
        return res.status(err.status).json({
          success: false,
          statusCode: err.status,
          message: err.message || 'Request parsing error',
          error: err.type || 'Error',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      next(err);
    },
  );

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
          if (
            /^https:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*curex24\.com$/i.test(
              origin,
            )
          )
            return callback(null, true);
          callback(null, false);
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
