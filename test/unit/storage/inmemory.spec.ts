import {InMemoryStorage} from '../../../src/storage/inmemory/InMemoryStorage';
import {Job} from '../../../src/types/Job';

describe('InMemoryStorage', () => {
    test('Enqueue job', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');

        // Act
        await storage.Enqueue(job);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(job);
        const result2 = await storage.Dequeue();
        expect(result2).toEqual(null);
    });

    test('Enqueue job twice', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Enqueue(job);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(job);
        const result2 = await storage.Dequeue();
        expect(result2).toEqual(null);
    });

    test('Enqueue job twice with different ID', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');
        const job2 = new Job('testID2', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Enqueue(job2);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(job);
        const result2 = await storage.Dequeue();
        expect(result2).toEqual(job2);
        const result3 = await storage.Dequeue();
        expect(result3).toEqual(null);
    });

    test('Delete job', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Delete(job.id);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(null);
    });

    test('Delete job twice', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Delete(job.id);
        await storage.Delete(job.id);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(null);
    });

    test('Delete job twice with different ID', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');
        const job2 = new Job('testID2', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Enqueue(job2);
        await storage.Delete(job.id);
        await storage.Delete(job2.id);

        // Assert
        const result = await storage.Dequeue();
        expect(result).toEqual(null);
    });

    test('Delete locked job', async () => {
        // Arrange
        const storage = new InMemoryStorage();
        const job = new Job('testID', 'testJob');

        // Act
        await storage.Enqueue(job);
        await storage.Dequeue();
        let deleted = false;
        storage.Delete(job.id).then(() => {
            deleted = true;
        });

        // Expect the promise to resolve after the lock is released
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(deleted).toEqual(false);
        await storage.ReleaseJob(job.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(deleted).toEqual(true);

        // Assert
        const result2 = await storage.Dequeue();
        expect(result2).toEqual(null);
    });
});