import type { APIEmbed, BaseInteraction, ClientOptions, JSONEncodable } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import Emittery from "emittery";
import chalk from "chalk";
import type { Promisable } from "type-fest";
import { Logger } from "Logger";
import type { ILogger } from "Logger";
import { measureTime } from "utils/common";
import { InteractionHook } from "interaction";
import type { UserError } from "errors/UserError";
import type { TypeOptions } from "types";

type BotEnvironment = "development" | "production";

export type EmbedLike = APIEmbed | JSONEncodable<APIEmbed>;
type CreateDefaultEmbedFunction = (hook?: InteractionHook<BaseInteraction>) => EmbedLike | null | undefined;
type CreateUserErrorEmbedFunction = (error: UserError) => EmbedLike | null | undefined;
export type InteractionListener<T extends BaseInteraction = BaseInteraction> = (hook: InteractionHook<T>) => Promisable<boolean | undefined>;

export interface BotOptions {
    readonly environment: BotEnvironment;
    readonly token: string;
    readonly clientOptions?: ClientOptions;
    readonly logger?: ILogger;
    readonly db: TypeOptions["db"];
    readonly style?: BotStyleOptions;
    readonly interactionHookCreator?: TypeOptions["interactionHookCreator"];
}

export interface BotStyleOptions {
    readonly createDefaultEmbed?: CreateDefaultEmbedFunction;
    readonly unknownErrorEmbed?: EmbedLike;
    readonly createUserErrorEmbed?: CreateUserErrorEmbedFunction;
}

interface BotMappedEvents {
    preInitialize: { bot: Bot<true>; setModules: (modules: TypeOptions["modules"]) => void };
    initialize: { bot: Bot<true> };
}

export class Bot<Ready extends boolean = boolean> extends Emittery<BotMappedEvents> {
    public readonly environment: BotEnvironment;
    private readonly token: string;
    private readonly _client: Client;
    public readonly logger: ILogger;
    public readonly db: TypeOptions["db"];
    public readonly style: BotStyleOptions;
    public readonly interactionHookCreator: TypeOptions["interactionHookCreator"];
    private _modules?: TypeOptions["modules"];
    private _stopping = false;
    private readonly interactionListeners: InteractionListener[] = [];

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
            ...options.clientOptions,
        });
        this.logger = options.logger ?? new Logger("Bot");
        this.db = options.db;
        this.style = {
            ...options.style,
        };
        this.interactionHookCreator = options.interactionHookCreator
            ?? ((interaction) => new InteractionHook(this, interaction));
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
        this._client.on("interactionCreate", (interaction) => {
            this.handleInteraction(interaction).catch((error: unknown) => {
                this.logger.error(new Error("Error while handling interaction", { cause: error }));
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

    public get modules(): TypeOptions["modules"] {
        if (this._modules == null) {
            throw new Error("Modules are not set yet");
        }
        return this._modules;
    }

    private async onReady(): Promise<void> {
        if (!this.isReady()) {
            throw new Error("Invalid ready state for onReady");
        }
        this.logger.info("Initializing...");
        await this.emit("preInitialize", {
            bot: this,
            setModules: (modules) => {
                this._modules = modules;
            },
        }).catch((error: unknown) => {
            throw new Error("Failed to process preInitialize event", { cause: error });
        });
        if (this._modules == null) {
            throw new Error("Modules are not set yet");
        }
        for (const [name, module] of Object.entries(this._modules)) {
            try {
                const [, time] = await measureTime(() => module.initialize());
                this.logger.info(`Module "${name}" initialized ${chalk.gray(`[took ${time.toFixed(2)}ms]`)}`);
            } catch (error) {
                throw new Error(`Error while initializing module "${name}"`, { cause: error });
            }
        }
        await this.emit("initialize", { bot: this }).catch((error: unknown) => {
            throw new Error("Failed to process initialize event", { cause: error });
        });
        this.logger.info(chalk.underline.green("Bot is ready"));
        Object.entries(this._modules).forEach(([name, module]) => {
            (async () => {
                await module.onReady();
            })().catch(async (error: unknown) => {
                await this.logger.error(new Error(`Error while executing onReady for module "${name}"`, { cause: error }));
            });
        });
    }

    public registerInteractionListener<T extends BaseInteraction = BaseInteraction>(
        listener: InteractionListener<T>,
    ): void {
        this.interactionListeners.push(listener as InteractionListener);
    }

    private async handleInteraction(interaction: BaseInteraction): Promise<void> {
        const hook = await this.interactionHookCreator(interaction);

        for (const listener of this.interactionListeners) {
            try {
                const handled = await listener(hook);
                if (handled === true) {
                    return;
                }
            } catch (error) {
                await this.handleInteractionError(hook, error);
                return;
            }
        }
    }

    private async handleInteractionError(hook: InteractionHook<BaseInteraction>, error: unknown): Promise<void> {
        const { UserError } = await import("errors/UserError");
        const isUserError = error instanceof UserError;

        const embedLike: NonNullable<EmbedLike> = isUserError
            ? (this.style.createUserErrorEmbed?.(error)
                ?? {
                    color: 0xE61B05,
                    description: error.message,
                })
            : (this.style.unknownErrorEmbed
                ?? {
                    color: 0xE61B05,
                    description: "An unexpected error occurred",
                });

        try {
            if (hook.interaction.isRepliable()) {
                const { EmbedBuilder, MessageFlags } = await import("discord.js");
                const embed = "toJSON" in embedLike ? new EmbedBuilder(embedLike.toJSON()) : new EmbedBuilder(embedLike);

                if (isUserError) {
                    if (hook.interaction.replied || hook.interaction.deferred) {
                        await hook.interaction.editReply({ embeds: [embed], content: null, files: [], components: [] });
                    } else {
                        await hook.interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                    }
                } else {
                    if (hook.interaction.replied || hook.interaction.deferred) {
                        await hook.interaction.followUp({ embeds: [embed] });
                    } else {
                        await hook.interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                    }
                    this.logger.error(new Error("Failed to handle interaction", { cause: error }));
                }
            }
        } catch (replyError) {
            this.logger.error(new Error("Failed to send error response", { cause: replyError }));
        }

        if (!isUserError) {
            this.logger.error(new Error("Unhandled error in interaction listener", { cause: error }));
        }
    }
}
