import type { Promisable } from "type-fest";
import chalk from "chalk";
import { measureTime } from "utils/common";
import { Logger } from "Logger";
import type { ILogger } from "Logger";

export interface DbManagerOptions {
    readonly logger?: ILogger;
}

export abstract class DbManager {
    private readonly logger: ILogger;

    public constructor(options?: DbManagerOptions) {
        this.logger = options?.logger ?? new Logger("DB");
    }

    public readonly attemptConnect = async (): Promise<void> => {
        this.logger.info("Connecting to DB...");
        const [, time] = await measureTime(() => this.connect());
        this.logger.info(`Connected to DB ${chalk.gray(`[took ${time.toFixed(2)}ms]`)}`);
        await this.initialize();
    };

    public readonly attemptDisconnect = async (): Promise<void> => {
        await this.disconnect();
        this.logger.info("Disconnected from DB");
    };

    protected abstract connect(): Promisable<void>;
    protected initialize(): Promisable<void> { /* ... */ }
    protected abstract disconnect(): Promisable<void>;
}
