import type { Promisable } from "type-fest";
import type { Bot } from "Bot";

export abstract class Module<ReadyBot extends Bot<true> = Bot<true>> {
    public readonly bot: ReadyBot;

    public constructor(bot: ReadyBot) {
        this.bot = bot;
    }

    public abstract initialize(): Promisable<void>;

    public onReady(): Promisable<void> { /* noop */ };

    public abstract destroy(): Promisable<void>;
}
