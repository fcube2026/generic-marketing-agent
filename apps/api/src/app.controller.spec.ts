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
      const result = controller.healthCheck();
      expect(result).toMatchObject({
        status: 'ok',
        service: 'Curex24 API',
      });
      expect(result).toHaveProperty('environment');
    });
  });

  describe('version', () => {
    it('should return version info', () => {
      const result = controller.version();
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
