import { Job } from 'bullmq';
import { OrderStatusProcessor } from './order-status.processor';
import { PharmacyJobService, PollResult } from './pharmacy-job.service';

describe('OrderStatusProcessor', () => {
  let processor: OrderStatusProcessor;
  let mockService: jest.Mocked<Pick<PharmacyJobService, 'pollOrderStatuses'>>;

  beforeEach(() => {
    mockService = {
      pollOrderStatuses: jest.fn(),
    };

    processor = new OrderStatusProcessor(
      mockService as unknown as PharmacyJobService,
    );
  });

  const createMockJob = (name: string, attemptsMade = 0): Job => {
    return {
      name,
      attemptsMade,
      data: {},
    } as unknown as Job;
  };

  it('calls pollOrderStatuses for the correct job name', async () => {
    const result: PollResult = {
      totalOrders: 2,
      updated: 1,
      skipped: 1,
      errors: 0,
    };
    mockService.pollOrderStatuses.mockResolvedValue(result);

    await processor.process(createMockJob('poll-order-statuses'));

    expect(mockService.pollOrderStatuses).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown job names', async () => {
    await processor.process(createMockJob('unknown-job'));

    expect(mockService.pollOrderStatuses).not.toHaveBeenCalled();
  });

  it('throws when all orders error (to trigger retry)', async () => {
    const result: PollResult = {
      totalOrders: 3,
      updated: 0,
      skipped: 0,
      errors: 3,
    };
    mockService.pollOrderStatuses.mockResolvedValue(result);

    await expect(
      processor.process(createMockJob('poll-order-statuses')),
    ).rejects.toThrow('All 3 order(s) failed to poll');
  });

  it('does not throw when some orders succeed alongside errors', async () => {
    const result: PollResult = {
      totalOrders: 3,
      updated: 1,
      skipped: 0,
      errors: 2,
    };
    mockService.pollOrderStatuses.mockResolvedValue(result);

    await expect(
      processor.process(createMockJob('poll-order-statuses')),
    ).resolves.not.toThrow();
  });
});
