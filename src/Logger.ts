import chalk from "chalk";
import type { Promisable } from "type-fest";
import { DateTime } from "luxon";

export interface ILogger {
    info(message: string): Promisable<void>;
    warn(message: string): Promisable<void>;
    error(error: unknown): Promisable<void>;
    debug(message: string): Promisable<void>;
}

export class Logger implements ILogger {
    private readonly _prefix?: string;

    public constructor(prefix: string) {
        this._prefix = chalk.yellowBright(`(${prefix})`);
    }

    private get currentDateTime() {
        return DateTime.now().toFormat("yyyy/MM/dd HH:mm:ss.SSS");
    }

    private get prefix() {
        if (this._prefix != null) {
            return `${chalk.gray(`[${this.currentDateTime}]`)} ${this._prefix}`;
        } else {
            return chalk.gray(`[${this.currentDateTime}]`);
        }
    }

    public info(message: string) {
        console.log(`${this.prefix} ${message}`);
    }

    public warn(message: string) {
        console.warn(`${this.prefix} ${chalk.yellowBright(message)}`);
    }

    public error(error: unknown): void {
        const message = error instanceof Error ? error.message : "An error occurred";
        if (typeof Bun !== "undefined") {
            console.error(`${this.prefix} ${chalk.redBright(message)}\n${Bun.inspect(error, { colors: true, sorted: true })}`);
        } else {
            console.error(`${this.prefix} ${chalk.redBright(message)}`);
            console.error(error);
        }
    }

    public debug(message: string): Promisable<void> {
        if (process.env.NODE_ENV === "production") {
            return;
        }
        console.debug(`${this.prefix} ${chalk.gray(message)}`);
    }
}
