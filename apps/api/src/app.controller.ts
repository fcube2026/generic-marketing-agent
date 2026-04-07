import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/roles.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  healthCheck() {
    return { status: 'ok', service: 'Curex24 API' };
  }
}
