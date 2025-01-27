import type { Bot } from "Bot";
import type { Promisable } from "type-fest";

export abstract class Module {
    private readonly _bot: Bot;

    public constructor(bot: Bot) {
        this._bot = bot;
    }

    public get bot(): Bot<true> {
        return this._bot as Bot<true>;
    }

    public abstract initialize(): Promisable<void>;

    public onReady(): Promisable<void> { /* noop */ };

    public abstract destroy(): Promisable<void>;
}
