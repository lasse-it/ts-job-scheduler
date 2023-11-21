import {Job} from '../types/Job';

export interface IStorage {
    // Enqueue adds or updates a job in the queue.
    Enqueue(job: Job): Promise<void>;

    // Dequeue locks a job and returns it. If no job is available, it returns null.
    Dequeue(): Promise<Job | null>;

    // Delete removes a job from the queue. If the job is locked, it will be unlocked.
    Delete(id: string): Promise<void>;
}