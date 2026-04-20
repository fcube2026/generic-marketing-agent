import { Job } from 'bullmq';
import { RefillReminderProcessor } from './refill-reminder.processor';
import { PharmacyJobService, RefillReminderData } from './pharmacy-job.service';

describe('RefillReminderProcessor', () => {
  let processor: RefillReminderProcessor;
  let mockService: jest.Mocked<
    Pick<
      PharmacyJobService,
      'hasReminderBeenSent' | 'sendNotification' | 'recordReminderSent'
    >
  >;

  beforeEach(() => {
    mockService = {
      hasReminderBeenSent: jest.fn().mockResolvedValue(false),
      sendNotification: jest.fn().mockResolvedValue(undefined),
      recordReminderSent: jest.fn().mockResolvedValue(undefined),
    };

    processor = new RefillReminderProcessor(
      mockService as unknown as PharmacyJobService,
    );
  });

  const createMockJob = (
    name: string,
    data: RefillReminderData,
    attemptsMade = 0,
  ): Job<RefillReminderData> => {
    return {
      name,
      data,
      attemptsMade,
    } as unknown as Job<RefillReminderData>;
  };

  const sampleData: RefillReminderData = {
    orderId: 'order-1',
    patientProfileId: 'patient-1',
    orderNumber: 'PHARM-TEST123',
    deliveredAt: new Date('2026-04-01'),
    refillDate: new Date('2026-05-01'),
    reminderDate: new Date('2026-04-28'),
    isFollowup: false,
  };

  it('sends notification and records reminder for initial reminder', async () => {
    const job = createMockJob('refill-reminder', sampleData);

    await processor.process(job);

    expect(mockService.sendNotification).toHaveBeenCalledTimes(1);
    expect(mockService.recordReminderSent).toHaveBeenCalledWith(
      'order-1',
      false,
    );
  });

  it('sends notification for follow-up reminder', async () => {
    const job = createMockJob('refill-reminder-followup', {
      ...sampleData,
      isFollowup: true,
    });

    await processor.process(job);

    expect(mockService.sendNotification).toHaveBeenCalledTimes(1);
    expect(mockService.recordReminderSent).toHaveBeenCalledWith(
      'order-1',
      true,
    );
  });

  it('skips already-sent reminders (idempotency)', async () => {
    mockService.hasReminderBeenSent.mockResolvedValue(true);

    const job = createMockJob('refill-reminder', sampleData);

    await processor.process(job);

    expect(mockService.sendNotification).not.toHaveBeenCalled();
    expect(mockService.recordReminderSent).not.toHaveBeenCalled();
  });

  it('ignores unknown job names', async () => {
    const job = createMockJob('unknown-job', sampleData);

    await processor.process(job);

    expect(mockService.sendNotification).not.toHaveBeenCalled();
  });

  it('reconstructs Date objects from serialized job data', async () => {
    // BullMQ serializes dates as strings in job data
    const serializedData = {
      ...sampleData,
      deliveredAt: '2026-04-01T00:00:00.000Z' as any,
      refillDate: '2026-05-01T00:00:00.000Z' as any,
      reminderDate: '2026-04-28T00:00:00.000Z' as any,
    };

    const job = createMockJob('refill-reminder', serializedData);

    await processor.process(job);

    const callArg = mockService.sendNotification.mock.calls[0][0];
    expect(callArg.deliveredAt).toBeInstanceOf(Date);
    expect(callArg.refillDate).toBeInstanceOf(Date);
    expect(callArg.reminderDate).toBeInstanceOf(Date);
  });
});
