import type { ApplicationCommandData } from "discord.js";
import type { InteractionOptions } from "../Interaction";
import { Interaction } from "../Interaction";

type CommandData = ApplicationCommandData;

export interface CommandOptions<Data extends CommandData, Param extends unknown[]> extends InteractionOptions<Data, Param> {
    readonly guildIds?: readonly string[];
}

export abstract class Command<
    Data extends CommandData,
    Raw,
    Param extends unknown[],
> extends Interaction<Data, Raw, Param> {
    public readonly guildIds: readonly string[] | undefined;

    public constructor(options: CommandOptions<Data, Param>) {
        super(options);
        this.guildIds = options.guildIds;
    }

    public get name() {
        return this.data.name;
    }
}
