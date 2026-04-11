import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/roles.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'Curex24 API',
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    };
  }

  @Public()
  @Get('version')
  version() {
    return {
      version: process.env.npm_package_version || '0.0.1',
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
