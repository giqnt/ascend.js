import type { Merge, Promisable } from "type-fest";
import type { BaseInteraction } from "discord.js";
import type { DbManager } from "db";
import type { Module } from "BotModule";
import type { InteractionContext } from "interaction";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomTypeOptions {};

export type TypeOptions = Merge<{
    db: DbManager | undefined;
    modules: Record<string, Module>;
    interactionContextCreator: <T extends BaseInteraction>(interaction: T) => Promisable<InteractionContext<T>>;
}, CustomTypeOptions>;
