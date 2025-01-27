import { ApplicationCommandOptionType } from "discord.js";
import type { ApplicationCommandSubGroupData } from "discord.js";
import type { Bot } from "Bot";
import { Interaction } from "interaction/Interaction";
import { InteractionContext } from "interaction/InteractionContext";
import type { SubCommand } from "./SubCommand";
import type { ChatInputCommandOptions, ChatInputParam, IChatInputCommand, RawChatInputAutocomplete, RawChatInputExecute } from "./IChatInputCommand";

type Data = ApplicationCommandSubGroupData;
interface SubCommandGroupOptions extends Omit<ChatInputCommandOptions<Omit<Data, "type" | "options">>, "execute"> {
    readonly subCommands: SubCommand[];
};

export class SubCommandGroup extends Interaction<Data, RawChatInputExecute, ChatInputParam> implements IChatInputCommand {
    public readonly subCommands: SubCommand[];

    public constructor(options: SubCommandGroupOptions) {
        super({
            ...options,
            data: {
                ...options.data,
                type: ApplicationCommandOptionType.SubcommandGroup,
                options: options.subCommands.map((subCommand) => subCommand.data),
            },
            execute: () => {
                throw new Error("SubCommandGroup.execute() should not be called");
            },
        });
        this.subCommands = options.subCommands;
    }

    public override isMine(interaction: RawChatInputExecute | RawChatInputAutocomplete): boolean {
        return interaction.options.getSubcommandGroup(false) === this.data.name;
    }

    public override async execute(bot: Bot<true>, interaction: RawChatInputExecute) {
        for (const subCommand of this.subCommands) {
            if (subCommand.isMine(interaction)) {
                await subCommand.execute(bot, interaction);
                return;
            }
        }
        throw new Error("execute 감지 실패");
    }

    public override transform(bot: Bot<true>, args: RawChatInputExecute): ChatInputParam {
        return [new InteractionContext(bot, args)];
    }

    public async autocomplete(bot: Bot<true>, interaction: RawChatInputAutocomplete) {
        for (const subCommand of this.subCommands) {
            if (subCommand.isMine(interaction)) {
                await subCommand.autocomplete(bot, interaction);
                return;
            }
        }
        throw new Error("Unable to find subcommand for autocomplete");
    }
}
