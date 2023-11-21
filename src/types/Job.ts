export class Job {
    executeAt: Date;
    lastError: Error | null = null;
    errorCount = 0;
    maxRetries = -1;
    recurringMillisecondDelay = 0;

    constructor(public id: string, public type: string) {
    }

    WithExecutionAt(date: Date): Job {
        this.executeAt = date;
        return this;
    }

    WithMaxRetries(maxRetries: number): Job {
        this.maxRetries = maxRetries;
        return this;
    }

    WithRecurring(delayMs: number): Job {
        this.recurringMillisecondDelay = delayMs;
        return this;
    }

    WithError(err: Error): Job {
        this.lastError = err;
        this.errorCount++;
        return this;
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

    WithNextExecutionAt(): Job {
        let delayMs = this.recurringMillisecondDelay;
        if (delayMs <= 0) {
            delayMs = 5000; // Retry after 5 seconds by default
        }
        this.executeAt = new Date(Date.now() + delayMs);
        return this;
    }
}