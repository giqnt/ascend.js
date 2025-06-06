import chalk from "chalk";
import type { Promisable } from "type-fest";
import type { ApplicationCommandData, ApplicationIntegrationType, AutocompleteInteraction, CommandInteraction, InteractionContextType } from "discord.js";
import { ApplicationCommandType, EmbedBuilder, InteractionType, MessageFlags } from "discord.js";
import { Module } from "BotModule";
import { measureTime } from "utils/common";
import { SlashCommand } from "interaction";
import type { Command } from "interaction";
import type { Bot, EmbedLike } from "Bot";
import { UserError } from "errors/UserError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = Command<ApplicationCommandData, any, any[]>;

interface CommandModuleOptions {
    readonly defaultContexts?: readonly InteractionContextType[];
    readonly defaultIntegrationTypes?: readonly ApplicationIntegrationType[];
    readonly defaultGuildIds?: readonly string[];
}

export class CommandModule extends Module {
    protected readonly _commands = new Map<string, AnyCommand>();
    private readonly defaultContexts?: readonly InteractionContextType[];
    private readonly defaultIntegrationTypes?: readonly ApplicationIntegrationType[];
    private readonly defaultGuildIds?: readonly string[];

    public constructor(bot: Bot, options?: CommandModuleOptions) {
        super(bot);
        this.defaultContexts = options?.defaultContexts;
        this.defaultIntegrationTypes = options?.defaultIntegrationTypes;
        this.defaultGuildIds = options?.defaultGuildIds;
    }

    public async initialize(): Promise<void> {
        await this.registerCommands();
        this.bot.client.on("interactionCreate", (interaction) => {
            if (interaction.isCommand()) {
                this.execute(interaction).catch((error: unknown) => this.onError(interaction, error));
            } else if (interaction.isAutocomplete()) {
                this.autocomplete(interaction).catch((error: unknown) => {
                    this.bot.logger.error(new Error(`Failed to autocomplete command "${interaction.commandName}" (${ApplicationCommandType[interaction.commandType]})`, { cause: error }));
                });
            }
        });
    }

    public destroy(): Promisable<void> {
        throw new Error("Method not implemented.");
    }

    public addCommand(command: AnyCommand): void {
        this._commands.set(command.name, command);
    }

    public addCommands(commands: AnyCommand[]): void {
        for (const command of commands) {
            this.addCommand(command);
        }
    }

    public async registerCommands(): Promise<void> {
        this.bot.logger.info("Registering commands...");
        const [count, time] = await measureTime(() => this._registerCommands());
        this.bot.logger.info(chalk.magenta(`Registered ${count} commands in total. `) + chalk.gray(`[took ${time.toFixed(2)}ms]`));
    }

    private async _registerCommands(): Promise<number> {
        const globalCommands: ApplicationCommandData[] = [];
        const commandsByGuildId = new Map<string, ApplicationCommandData[]>();
        for (const command of this._commands.values()) {
            const data: ApplicationCommandData = {
                contexts: this.defaultContexts,
                integrationTypes: this.defaultIntegrationTypes,
                ...command.data,
            };
            const guildIds = command.guildIds ?? this.defaultGuildIds;
            if (guildIds != null && guildIds.length > 0) {
                for (const guildId of guildIds) {
                    const list = commandsByGuildId.get(guildId) ?? [];
                    if (!commandsByGuildId.has(guildId)) commandsByGuildId.set(guildId, list);
                    list.push(data);
                }
            } else {
                globalCommands.push(data);
            }
        }

        let count = 0;
        {
            const result = await this.bot.client.application.commands.set(globalCommands);
            count += result.size;
            this.bot.logger.info(`Registered ${result.size} global commands.`);
        }
        for (const [guildId, commands] of commandsByGuildId.entries()) {
            const result = await this.bot.client.application.commands.set(commands, guildId);
            count += result.size;
            this.bot.logger.info(`Registered ${result.size} commands for guild ${chalk.cyan(guildId)}.`);
        }
        return count;
    }

    private async execute(interaction: CommandInteraction): Promise<void> {
        const command = this._commands.get(interaction.commandName);
        if (command == null) {
            this.bot.logger.warn(`Command "${interaction.commandName}" (${InteractionType[interaction.type]}) not found.`);
            return;
        }
        await command.execute(this.bot, interaction);
    }

    private async onError(interaction: CommandInteraction, error: unknown): Promise<void> {
        const isUserError = error instanceof UserError;
        const embedLike: NonNullable<EmbedLike> = isUserError
            ? (this.bot.style.createUserErrorEmbed?.(error)
                ?? new EmbedBuilder()
                    .setColor("#E61B05")
                    .setDescription(error.message))
            : (this.bot.style.unknownErrorEmbed
                ?? new EmbedBuilder()
                    .setColor("#E61B05")
                    .setDescription("An unexpected error occurred"));
        const embed = "toJSON" in embedLike ? new EmbedBuilder(embedLike.toJSON()) : new EmbedBuilder(embedLike);
        if (isUserError) {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], content: null, files: [], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
            await this.bot.logger.error(new Error(`Failed to execute command "${interaction.commandName}" (${ApplicationCommandType[interaction.commandType]})`, { cause: error }));
        }
    }

    private async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = this._commands.get(interaction.commandName);
        if (command == null) {
            this.bot.logger.warn(`Command "${interaction.commandName}" (${InteractionType[interaction.type]}) not found.`);
            return;
        }
        if (!(command instanceof SlashCommand)) {
            this.bot.logger.warn(`Command "${interaction.commandName}" (${InteractionType[interaction.type]}) is not a slash command.`);
            return;
        }
        await command.autocomplete(this.bot, interaction);
    }
}
