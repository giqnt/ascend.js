import { Logger } from "Logger";
import type { ILogger } from "Logger";
import type { ClientOptions } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import Emittery from "emittery";
import { measureTime } from "utils/common";
import chalk from "chalk";
import type { DbManager } from "db";
import type { Module } from "BotModule";
import type { Merge } from "type-fest";

type BotEnvironment = "development" | "production";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomTypeOptions {};

type TypeOptions = Merge<{
    db: DbManager | undefined;
    modules: Record<string, Module>;
}, CustomTypeOptions>;

export interface BotOptions {
    readonly environment: BotEnvironment;
    readonly token: string;
    readonly client?: ClientOptions;
    readonly logger?: ILogger;
    readonly db: TypeOptions["db"];
    readonly createModules: (bot: Bot) => TypeOptions["modules"];
}

interface BotMappedEvents {
    preInitialize: Bot<true>;
    initialize: Bot<true>;
}

export class Bot<Ready extends boolean = boolean> extends Emittery<BotMappedEvents> {
    public readonly environment: BotEnvironment;
    private readonly token: string;
    public readonly _client: Client;
    public readonly logger: ILogger;
    public readonly db: TypeOptions["db"];
    public readonly modules: TypeOptions["modules"];
    private _stopping = false;

    public constructor(options: BotOptions) {
        super();
        this.environment = options.environment;
        this.token = options.token;
        this._client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
            ],
            allowedMentions: {
                repliedUser: false,
            },
            ...options.client,
        });
        this.logger = options.logger ?? new Logger("Bot");
        this.db = options.db;
        this.modules = options.createModules(this);
        this._client.on("error", (error) => {
            this.logger.error(error);
        });
        this._client.on("ready", () => {
            this.onReady().catch(async (error: unknown) => {
                this.logger.error(new Error("Error while processing ready event", { cause: error }));
                await this.stop();
            }).catch((error: unknown) => {
                this.logger.error(new Error("Error while stopping bot", { cause: error }));
            });
        });
    }

    public async start(): Promise<void> {
        if (this._client.isReady()) {
            throw new Error("Client is already logged in");
        }
        if (this._stopping) {
            throw new Error("Invalid state: bot is stopping");
        }
        await this.db?.attemptConnect();
        this.logger.info("Logging in...");
        const [, time] = await measureTime(() => this._client.login(this.token));
        this.logger.info(`Logged in as ${chalk.underline(this.client.user?.tag)} ${chalk.gray(`[took ${time.toFixed(2)}ms]`)}`);
    }

    public async stop(): Promise<void> {
        if (this._stopping) {
            throw new Error("Bot is already stopping");
        }
        this._stopping = true;
        if (!this._client.isReady()) {
            throw new Error("Client is not logged in");
        }
        this.logger.info("Stopping bot...");
        await this._client.destroy();
        this.logger.info("Logged out");
        await this.db?.attemptDisconnect();
        this.logger.info("Successfully stopped");
    }

    public isReady(): this is Bot<true> {
        return this._client.isReady();
    }

    public get client(): Ready extends true ? Client<true> : Client {
        return this._client as never;
    }

    private async onReady(): Promise<void> {
        if (!this.isReady()) {
            throw new Error("Invalid ready state for onReady");
        }
        this.logger.info("Initializing...");
        await this.emit("preInitialize", this).catch((error: unknown) => {
            throw new Error("Failed to process preInitialize event", { cause: error });
        });
        for (const [name, module] of Object.entries(this.modules)) {
            try {
                const [, time] = await measureTime(() => module.initialize());
                this.logger.info(`Module "${name}" initialized ${chalk.gray(`[took ${time.toFixed(2)}ms]`)}`);
            } catch (error) {
                throw new Error(`Error while initializing module "${name}"`, { cause: error });
            }
        }
        await this.emit("initialize", this).catch((error: unknown) => {
            throw new Error("Failed to process initialize event", { cause: error });
        });
        this.logger.info(chalk.underline.green("Bot is ready"));
        Object.entries(this.modules).forEach(([name, module]) => {
            (async () => {
                await module.onReady();
            })().catch(async (error: unknown) => {
                await this.logger.error(new Error(`Error while executing onReady for module "${name}"`, { cause: error }));
            });
        });
    }
}
