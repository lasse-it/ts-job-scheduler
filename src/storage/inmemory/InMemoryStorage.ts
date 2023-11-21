import {IStorage} from '../IStorage';
import {Job} from '../../types/Job';
import {Mutex} from 'async-mutex';

class LockedJob {
    constructor(public jobID: string, public timeOutAt: Date) {
    }
}

const lockTimeoutMs = 10000;
const lockPollIntervalMs = 100;

export class InMemoryStorage implements IStorage {
    private jobs: Job[] = [];
    private lockedJobs: LockedJob[] = [];
    private storageMutex = new Mutex();

    async Delete(jobID: string) {
        await this.lockJob(jobID);
        await this.storageMutex.runExclusive(async () => {
            this.jobs = this.jobs.filter(job => job.id !== jobID);
        });
        await this.unlockJob(jobID);
    }

    async Enqueue(job: Job) {
        await this.lockJob(job.id);
        await this.storageMutex.runExclusive(async () => {
            // Remove any existing job with the same ID
            this.jobs = this.jobs.filter(existingJob => existingJob.id !== job.id);
            this.jobs.push(job);
        });
        await this.unlockJob(job.id);
    }

    async Dequeue() {
        const job = await this.getNextJob();
        if (!job) {
            return null;
        }

        await this.lockJob(job.id);
        return job;
    }

    async ReleaseJob(jobID: string) {
        await this.unlockJob(jobID);
    }

    private async processExpiredLocks() {
        return this.storageMutex.runExclusive(async () => {
            // Find all expired locks and remove them from the lockedJobs array
            const now = new Date();
            this.lockedJobs = this.lockedJobs.filter(lockedJob => lockedJob.timeOutAt > now);
        });
    }

    private async getNextJob() {
        await this.processExpiredLocks();
        return this.storageMutex.runExclusive(async (): Promise<Job | null> => {
            const sortedJobs = this.jobs.sort((a, b) => a.executeAt.getTime() - b.executeAt.getTime());
            const now = new Date();
            const job = sortedJobs.filter(job => job.executeAt <= now).find(job => !this.lockedJobs.find(lockedJob => lockedJob.jobID === job.id));
            return job || null;
        });
    }

    private async tryLockJob(jobID: string): Promise<LockedJob | null> {
        return await this.storageMutex.runExclusive(async (): Promise<LockedJob | null> => {
            const existingLock = this.lockedJobs.find(lockedJob => lockedJob.jobID === jobID);
            if (existingLock) {
                return null;
            }

            const lockedJob = new LockedJob(jobID, new Date(Date.now() + lockTimeoutMs));
            this.lockedJobs.push(lockedJob);
            return lockedJob;
        });
    }
    private async lockJob(jobID: string): Promise<LockedJob> {
        const lockedJob = await this.tryLockJob(jobID);
        if (lockedJob) {
            return lockedJob;
        }
        await new Promise(resolve => setTimeout(resolve, lockPollIntervalMs));
        return this.lockJob(jobID);
    }

    private async unlockJob(jobID: string) {
        return this.storageMutex.runExclusive(async (): Promise<void> => {
            this.lockedJobs = this.lockedJobs.filter(lockedJob => lockedJob.jobID !== jobID);
        });
    }
}