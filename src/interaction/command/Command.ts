import type { ApplicationCommandData } from "discord.js";
import type { InteractionOptions } from "../Interaction";
import { Interaction } from "../Interaction";

type CommandData = ApplicationCommandData;

export type CommandOptions<
    Data extends CommandData,
    Param extends unknown[],
> = InteractionOptions<Data, Param>;

export abstract class Command<
    Data extends CommandData,
    Raw,
    Param extends unknown[],
> extends Interaction<Data, Raw, Param> {
    public get name() {
        return this.data.name;
    }
}
