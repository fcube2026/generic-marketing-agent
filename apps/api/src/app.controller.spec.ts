import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('healthCheck', () => {
    it('should return ok status', () => {
      expect(controller.healthCheck()).toEqual({
        status: 'ok',
        service: 'Curex24 API',
      });
    });
  });
});
