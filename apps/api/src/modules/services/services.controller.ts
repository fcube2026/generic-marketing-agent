import { Controller, Get } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Public } from '../auth/decorators/roles.decorator';

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Public()
  @Get()
  getAllCategories() {
    return this.servicesService.getAllCategories();
  }
}
