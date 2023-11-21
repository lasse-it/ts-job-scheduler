export class Job {
    executeAt: Date;
    lastError: Error | null = null;
    errorCount = 0;
    maxRetries = -1;
    recurringMillisecondDelay = 0;

    constructor(public id: string, public type: string) {
        this.executeAt = new Date();
    }

    Clone(): Job {
        const job = new Job(this.id, this.type);
        job.executeAt = this.executeAt;
        job.lastError = this.lastError;
        job.errorCount = this.errorCount;
        job.maxRetries = this.maxRetries;
        job.recurringMillisecondDelay = this.recurringMillisecondDelay;
        return job;
    }

    WithExecutionAt(date: Date): Job {
        const j = this.Clone()
        j.executeAt = date;
        return j;
    }

    WithNextExecutionAt(): Job {
        const j = this.Clone()
        let delayMs = j.recurringMillisecondDelay;
        if (delayMs <= 0) {
            delayMs = 5000; // Retry after 5 seconds by default
        }
        j.executeAt = new Date(j.executeAt.getTime() + delayMs);
        return j;
    }

    WithMaxRetries(maxRetries: number): Job {
        const j = this.Clone()
        j.maxRetries = maxRetries;
        return j;
    }

    WithRecurring(delayMs: number): Job {
        const j = this.Clone()
        j.recurringMillisecondDelay = delayMs;
        return j;
    }

    WithError(err: Error): Job {
        const j = this.Clone()
        j.lastError = err;
        j.errorCount++;
        return j;
    }

    ShouldRetry(): boolean {
        if (this.maxRetries < 0) {
            return true;
        }
        return this.errorCount <= this.maxRetries;
    }

    IsRecurring(): boolean {
        return this.recurringMillisecondDelay > 0;
    }
}