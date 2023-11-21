import {IStorage} from '../storage/IStorage';
import {Job} from '../types/Job';

type Handler = (job: Job) => Promise<void>;
type ExceptionHandler = (job: Job | null, err: Error) => void;

interface Logger {
    error(message: string): void;

    info(message: string): void;
}

export class Scheduler {
    private handlers = new Map<string, Handler>();
    private exceptionHandler: ExceptionHandler | null = null;
    private stopped = false;
    private workerPromise: Promise<void> | null = null;

    constructor(private storage: IStorage, private logger: Logger) {
    }

    WithHandler(jobType: string, handler: Handler): Scheduler {
        if (this.handlers.has(jobType)) {
            throw new Error(`Job type ${jobType} already has a handler`);
        }

        this.handlers.set(jobType, handler);
        return this;
    }

    WithExceptionHandler(handler: ExceptionHandler): Scheduler {
        this.exceptionHandler = handler;
        return this;
    }

    async Enqueue(job: Job) {
        await this.storage.Enqueue(job);
        this.logger.info(`enqueued job ${job.id} of type ${job.type}, execute at ${job.executeAt.toISOString()}`)
    }

    async Start() {
        this.workerPromise = this.worker().catch(err => this.handleException(null, err));
        this.logger.info('scheduler started');
    }

    async Stop() {
        this.stopped = true;
        await this.workerPromise;
        this.logger.info('scheduler stopped');
    }

    private async worker() {
        this.stopped = false;
        while (!this.stopped) {
            let job: Job | null = null;
            try {
                job = await this.storage.Dequeue();
                if (!job) {
                    if (this.stopped) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                await this.processJob(job);
                await this.handleSuccess(job);
            } catch (err) {
                this.handleException(job, err);
                await this.handleFailure(job, err);
            }
        }
    }

    private async processJob(job: Job) {
        const handler = this.handlers.get(job.type);
        if (!handler) {
            throw new Error(`No handler for job type '${job.type}'`);
        }
        await handler(job);
    }

    private async handleSuccess(job: Job) {
        if (job.IsRecurring()) {
            const nextJob = job.WithNextExecutionAt();
            await this.storage.Enqueue(nextJob);
            this.logger.info(`processed recurring job '${job.type}:${job.id}', next execution at ${nextJob.executeAt.toISOString()}`)
            return;
        }

        await this.storage.Delete(job.id);
        this.logger.info(`processed job '${job.type}:${job.id}'`)
    }

    private async handleFailure(job: Job, err: Error) {
        if (job.ShouldRetry()) {
            await this.storage.Enqueue(job.WithError(err));
            this.logger.error(`re-queued job '${job.type}:${job.id}': ${err.message}`)
            return;
        }

        await this.storage.Delete(job.id);
        this.logger.error(`deleted job '${job.type}:${job.id}': ${err.message}`)
    }

    async handleException(job: Job | null, err: Error) {
        if (job) {
            this.logger.error(`failed to process job '${job.type}:${job.id}': ${err.message}`)
        } else {
            this.logger.error(`an exception occurred: ${err.message}`)
        }
        if (this.exceptionHandler) {
            this.exceptionHandler(job, err);
        }
    }
}