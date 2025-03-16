import { ApplicationCommandOptionType } from "discord.js";
import type { ApplicationCommandSubCommandData } from "discord.js";
import type { AutocompleteHandler, ChatInputCommandOptions, ChatInputParam, IChatInputCommand, RawChatInputAutocomplete, RawChatInputExecute } from "./IChatInputCommand";
import { Interaction } from "interaction/Interaction";
import type { Bot } from "Bot";

type Data = ApplicationCommandSubCommandData;

export class SubCommand extends Interaction<Data, RawChatInputExecute, ChatInputParam> implements IChatInputCommand {
    protected readonly _autocomplete?: AutocompleteHandler;

    public constructor(options: ChatInputCommandOptions<Omit<Data, "type">>) {
        super({
            ...options,
            data: {
                ...options.data,
                type: ApplicationCommandOptionType.Subcommand,
            },
        });
        this._autocomplete = options.autocomplete;
    }

    public override isMine(interaction: RawChatInputExecute | RawChatInputAutocomplete): boolean {
        return interaction.options.getSubcommand(false) === this.data.name;
    }

    public override async transform(bot: Bot<true>, args: RawChatInputExecute): Promise<ChatInputParam> {
        return [await bot.interactionContextCreator(args)];
    }

    public async autocomplete(bot: Bot<true>, interaction: RawChatInputAutocomplete): Promise<void> {
        await interaction.respond(await this._autocomplete?.(bot, interaction.options) ?? []);
        return;
    }
}
