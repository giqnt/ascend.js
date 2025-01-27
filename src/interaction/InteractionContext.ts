import type { Bot } from "Bot";
import type { BaseInteraction } from "discord.js";

export class InteractionContext<T extends BaseInteraction> {
    public readonly bot: Bot;
    public readonly interaction: T;

    public constructor(bot: Bot, interaction: T) {
        this.bot = bot;
        this.interaction = interaction;
    }

    public get member(): T["member"] {
        return this.interaction.member;
    }

    public get guild(): T["guild"] {
        return this.interaction.guild;
    }

    public get channel(): T["channel"] {
        return this.interaction.channel;
    }

    public get channelId(): T["channelId"] {
        return this.interaction.channelId;
    }
}
