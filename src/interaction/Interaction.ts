import type { Bot } from "Bot";
import type { Promisable } from "type-fest";

type ExecuteFunction<Param extends unknown[]> = (...args: Param) => Promisable<void>;

export interface InteractionOptions<Data, Param extends unknown[]> {
    readonly data: Data;
    readonly execute: ExecuteFunction<Param>;
}

export abstract class Interaction<Data, Raw, Param extends unknown[] = [Raw]> {
    public readonly data: Data;
    protected readonly _execute: ExecuteFunction<Param>;

    public constructor(options: InteractionOptions<Data, Param>) {
        this.data = options.data;
        this._execute = options.execute;
    }

    public abstract isMine(args: Raw): boolean;

    public async execute(bot: Bot<true>, args: Raw) {
        await this._execute(...await this.transform(bot, args));
    }

    protected abstract transform(bot: Bot<true>, args: Raw): Promisable<Param>;
}
