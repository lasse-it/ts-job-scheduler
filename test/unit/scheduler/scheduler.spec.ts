import {mock} from 'jest-mock-extended';
import {Scheduler} from '../../../src/scheduler/Scheduler';
import {IStorage} from '../../../src/storage/IStorage';
import {Job} from '../../../src/types/Job';
import {Logger} from 'tslog';

describe('Scheduler', () => {
    test('Enqueue job', async () => {
        const logger = new Logger();
        const mockStorage = mock<IStorage>();
        const scheduler = new Scheduler(mockStorage, logger);
        const job = new Job('testID', 'testJob');

        await scheduler.Enqueue(job);
        expect(mockStorage.Enqueue).toHaveBeenCalledWith(job);
    });

    test('Process job', async () => {
        const logger = new Logger();
        const mockStorage = mock<IStorage>();
        const scheduler = new Scheduler(mockStorage, logger);
        const job = new Job('testID', 'testJob');
        const handler = jest.fn();
        scheduler.WithHandler('testJob', handler);

        mockStorage.Dequeue.mockResolvedValueOnce(job);
        await scheduler.Start();
        await scheduler.Stop();

        expect(handler).toHaveBeenCalledWith(job);
        expect(mockStorage.Delete).toHaveBeenCalledWith(job.id);
    });

    test('Enqueue recurring job', async () => {
        const logger = new Logger();
        const mockStorage = mock<IStorage>();
        const scheduler = new Scheduler(mockStorage, logger);
        const job = new Job('testID', 'testJob').WithRecurring(5000);
        const nextJob = job.WithNextExecutionAt();
        const handler = jest.fn();
        scheduler.WithHandler('testJob', handler);

        // Enqueue the job
        mockStorage.Dequeue.mockResolvedValueOnce(job);
        await scheduler.Enqueue(job);
        expect(mockStorage.Enqueue).toHaveBeenCalledWith(job);

        // Run the scheduler
        await scheduler.Start();
        await scheduler.Stop();

        // Assert that the job was re-enqueued
        expect(mockStorage.Delete).not.toHaveBeenCalled();
        expect(mockStorage.Enqueue).toHaveBeenCalledWith(nextJob);
    });
});