import {Job} from '../types/Job';

export interface IStorage {
  Enqueue(job: Job): Promise<void>;
  // Dequeue locks a job and returns it. If no job is available, it returns null.
  Dequeue(): Promise<Job | null>;

  Delete(id: string): Promise<void>;
}