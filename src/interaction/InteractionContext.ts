import type { Bot } from "Bot";
import { EmbedBuilder } from "discord.js";
import type { BaseInteraction } from "discord.js";

export class InteractionContext<T extends BaseInteraction> {
    public readonly _bot: Bot;
    public readonly interaction: T;

    public constructor(bot: Bot, interaction: T) {
        this._bot = bot;
        this.interaction = interaction;
    }

    public get bot(): Bot {
        if (!this._bot.isReady()) {
            throw new Error("Bot is not ready.");
        }
        return this._bot;
    }

    public get client() {
        return this.bot.client;
    }

    public get user(): T["user"] {
        return this.interaction.user;
    }

    public get member(): T["member"] {
        return this.interaction.member;
    }

    public get guild(): T["guild"] {
        return this.interaction.guild;
    }

    public get guildId(): T["guildId"] {
        return this.interaction.guildId;
    }

    public get channel(): T["channel"] {
        return this.interaction.channel;
    }

    public get channelId(): T["channelId"] {
        return this.interaction.channelId;
    }

    public embed(): EmbedBuilder {
        const embed = this.bot.createDefaultEmbed?.(this);
        if (embed == null) {
            return new EmbedBuilder();
        }
        return "toJSON" in embed ? new EmbedBuilder(embed.toJSON()) : new EmbedBuilder(embed);
    }
}
