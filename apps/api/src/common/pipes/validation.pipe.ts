import { ValidationPipe as NestValidationPipe } from '@nestjs/common';

export const createValidationPipe = () =>
  new NestValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  });
