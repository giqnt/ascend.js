import { ApplicationCommandOptionType } from "discord.js";
import type { ApplicationCommandSubCommandData } from "discord.js";
import { Interaction } from "interaction/Interaction";
import { InteractionContext } from "interaction/InteractionContext";
import type { Bot } from "Bot";
import type { AutocompleteHandler, ChatInputCommandOptions, ChatInputParam, IChatInputCommand, RawChatInputAutocomplete, RawChatInputExecute } from "./IChatInputCommand";

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

    public override transform(bot: Bot<true>, interaction: RawChatInputExecute): ChatInputParam {
        return [new InteractionContext(bot, interaction)];
    }

    public async autocomplete(bot: Bot<true>, interaction: RawChatInputAutocomplete): Promise<void> {
        await interaction.respond(await this._autocomplete?.(bot, interaction.options) ?? []);
        return;
    }
}
