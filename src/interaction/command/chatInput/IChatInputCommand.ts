import type { Bot } from "Bot";
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import type { InteractionContext, InteractionOptions } from "interaction";
import type { Promisable } from "type-fest";

export type RawChatInputExecute = ChatInputCommandInteraction;
export type RawChatInputAutocomplete = AutocompleteInteraction;
export type ChatInputParam = [context: InteractionContext<RawChatInputExecute>];

export type AutocompleteHandler =
    (bot: Bot<true>, options: RawChatInputAutocomplete["options"]) => Promisable<ApplicationCommandOptionChoiceData[] | undefined>;

export interface ChatInputCommandOptions<Data> extends InteractionOptions<Data, ChatInputParam> {
    readonly autocomplete?: AutocompleteHandler;
};

export interface IChatInputCommand {
    autocomplete(bot: Bot<true>, interaction: AutocompleteInteraction): Promise<void>;

    transform(bot: Bot<true>, interaction: RawChatInputExecute): ChatInputParam;
}
