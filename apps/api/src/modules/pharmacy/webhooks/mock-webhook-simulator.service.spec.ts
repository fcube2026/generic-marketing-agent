import { MockWebhookSimulatorService } from './mock-webhook-simulator.service';
import { PharmacyOrderWebhookService } from './pharmacy-order-webhook.service';

describe('MockWebhookSimulatorService', () => {
  let simulator: MockWebhookSimulatorService;
  let mockWebhookService: jest.Mocked<PharmacyOrderWebhookService>;

  beforeEach(() => {
    mockWebhookService = {
      handleOrderStatusWebhook: jest.fn().mockResolvedValue({
        processed: true,
        message: 'Status updated',
        orderId: 'order-1',
        status: 'CONFIRMED',
      }),
      mapStatus: jest.fn(),
      onStatusUpdated: jest.fn(),
    } as any;

    simulator = new MockWebhookSimulatorService(mockWebhookService);

    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('startSimulation', () => {
    it('returns started=true with correct message', () => {
      const result = simulator.startSimulation('MOCK-ORD-123', {
        delayMs: 1000,
      });

      expect(result.started).toBe(true);
      expect(result.partnerOrderId).toBe('MOCK-ORD-123');
      expect(result.message).toContain('5 steps');
    });

    it('limits steps with maxSteps option', () => {
      const result = simulator.startSimulation('MOCK-ORD-123', {
        maxSteps: 2,
      });

      expect(result.message).toContain('2 steps');
    });

    it('returns started=false when maxSteps is 0', () => {
      const result = simulator.startSimulation('MOCK-ORD-123', {
        maxSteps: 0,
      });

      expect(result.started).toBe(false);
    });
  });

  describe('stopSimulation', () => {
    it('returns true when stopping an active simulation', () => {
      simulator.startSimulation('MOCK-ORD-123', { delayMs: 10000 });
      const result = simulator.stopSimulation('MOCK-ORD-123');
      expect(result).toBe(true);
    });

    it('returns false when no active simulation exists', () => {
      const result = simulator.stopSimulation('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('isSimulationActive', () => {
    it('returns true for active simulation', () => {
      simulator.startSimulation('MOCK-ORD-123', { delayMs: 10000 });
      expect(simulator.isSimulationActive('MOCK-ORD-123')).toBe(true);
    });

    it('returns false for inactive simulation', () => {
      expect(simulator.isSimulationActive('nonexistent')).toBe(false);
    });
  });

  describe('triggerSingleWebhook', () => {
    it('calls webhookService with correct parameters', async () => {
      await simulator.triggerSingleWebhook('MOCK-ORD-123', 'packed');

      expect(mockWebhookService.handleOrderStatusWebhook).toHaveBeenCalledWith(
        'mock',
        'MOCK-ORD-123',
        'packed',
        expect.any(String),
      );
    });

    it('returns the webhook processing result', async () => {
      const result = await simulator.triggerSingleWebhook(
        'MOCK-ORD-123',
        'confirmed',
      );

      expect(result.processed).toBe(true);
    });
  });

  describe('simulation execution', () => {
    it('sends webhooks after each delay', async () => {
      simulator.startSimulation('MOCK-ORD-123', { delayMs: 1000 });

      // Advance first timer
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // flush microtasks

      expect(mockWebhookService.handleOrderStatusWebhook).toHaveBeenCalledTimes(
        1,
      );
      expect(mockWebhookService.handleOrderStatusWebhook).toHaveBeenCalledWith(
        'mock',
        'MOCK-ORD-123',
        'confirmed',
        expect.any(String),
      );
    });

    it('cancels previous simulation when starting a new one for the same order', () => {
      simulator.startSimulation('MOCK-ORD-123', { delayMs: 10000 });
      simulator.startSimulation('MOCK-ORD-123', { delayMs: 5000 });

      // Only one simulation should be active
      expect(simulator.isSimulationActive('MOCK-ORD-123')).toBe(true);
    });
  });
});
