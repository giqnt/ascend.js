import chalk from "chalk";
import { Module } from "BotModule";
import type { Promisable } from "type-fest";
import { measureTime } from "utils/common";
import type { Command } from "interaction";
import { InteractionType } from "discord.js";
import type { ApplicationCommandData, CommandInteraction } from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = Command<ApplicationCommandData, any, any[]>;

export class CommandModule extends Module {
    protected readonly _commands = new Map<string, AnyCommand>();

    public async initialize(): Promise<void> {
        await this.registerCommands();
        this.bot.client.on("interactionCreate", (interaction) => {
            if (!interaction.inCachedGuild() || !interaction.isCommand()) return;
            this.execute(interaction).catch((error: unknown) => {
                this.bot.logger.error(new Error(`Failed to execute command "${interaction.commandName}" (${InteractionType[interaction.type]})`, { cause: error }));
            });
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
        this.bot.logger.info(chalk.magenta(`Registered ${count} slash commands. `) + chalk.gray(`[took ${time.toFixed(2)}ms]`));
    }

    private async _registerCommands(): Promise<number> {
        const data = this._commands.values()
            .map((command) => command.data)
            .toArray();
        const results = await this.bot.client.application.commands.set(data);
        return results.size;
    }

    private async execute(interaction: CommandInteraction<"cached">): Promise<void> {
        const command = this._commands.get(interaction.commandName);
        if (command == null) {
            this.bot.logger.warn(`Command "${interaction.commandName}" (${InteractionType[interaction.type]}) not found.`);
            return;
        }
        await command.execute(this.bot, interaction);
    }
}
