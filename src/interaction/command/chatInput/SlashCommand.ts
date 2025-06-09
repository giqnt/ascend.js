import type { ChatInputApplicationCommandData } from "discord.js";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import type { CommandOptions } from "../Command";
import { Command } from "../Command";
import type { AutocompleteHandler, ChatInputCommandOptions, ChatInputParam, IChatInputCommand, RawChatInputAutocomplete, RawChatInputExecute } from "./IChatInputCommand";
import type { SubCommand } from "./SubCommand";
import type { SubCommandGroup } from "./SubCommandGroup";
import type { Bot } from "Bot";

type Data = ChatInputApplicationCommandData;

type SlashCommandOptions = CommandOptions<Data, ChatInputParam> & ChatInputCommandOptions<Data>;
interface ParentSlashCommandOptions extends Omit<SlashCommandOptions, "execute"> {
    readonly subCommands: readonly (SubCommand | SubCommandGroup)[];
}

export class SlashCommand extends Command<Data, RawChatInputExecute, ChatInputParam> implements IChatInputCommand {
    protected readonly _autocomplete?: AutocompleteHandler;
    public readonly subCommands: readonly (SubCommand | SubCommandGroup)[] | null = null;

    public constructor(options: SlashCommandOptions | ParentSlashCommandOptions) {
        super({
            execute: () => { throw new Error("Not implemented"); },
            ...options,
            data: {
                ...options.data,
                type: ApplicationCommandType.ChatInput,
                options: "subCommands" in options ? options.subCommands.map((subCommand) => subCommand.data) : options.data.options,
            },
        });
        this._autocomplete = options.autocomplete;
        if ("subCommands" in options) {
            this.subCommands = options.subCommands;
        }
    }

    public override isMine(interaction: RawChatInputExecute | RawChatInputAutocomplete): boolean {
        return interaction.commandName === this.name;
    }

    public override async execute(bot: Bot, interaction: RawChatInputExecute) {
        if (this.subCommands !== null) {
            const isSubGroup = interaction.options.getSubcommandGroup(false) != null;
            for (const subCommand of this.subCommands) {
                if (isSubGroup && subCommand.data.type !== ApplicationCommandOptionType.SubcommandGroup) continue;
                if (subCommand.isMine(interaction)) {
                    await subCommand.execute(bot, interaction);
                    return;
                }
            }
            throw new Error(`No matching subcommand found for command '${this.name}'`);
        }
        await super.execute(bot, interaction);
    }

    public override async transform(bot: Bot<true>, args: RawChatInputExecute): Promise<ChatInputParam> {
        return [await bot.interactionHookCreator(args)];
    }

    public async autocomplete(bot: Bot<true>, interaction: RawChatInputAutocomplete): Promise<void> {
        if (this.subCommands !== null) {
            const isSubGroup = interaction.options.getSubcommandGroup(false) != null;
            for (const subCommand of this.subCommands) {
                if (isSubGroup && subCommand.data.type !== ApplicationCommandOptionType.SubcommandGroup) continue;
                if (subCommand.isMine(interaction)) {
                    await subCommand.autocomplete(bot, interaction);
                    return;
                }
            }
            throw new Error(`No matching subcommand found for autocomplete in command '${this.name}'`);
        } else {
            await interaction.respond(await this._autocomplete?.(bot, interaction.options) ?? []);
            return;
        }
    }
}
