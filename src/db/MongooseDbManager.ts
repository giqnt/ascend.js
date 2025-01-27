import type mongoose from "mongoose";
import type { DbManagerOptions } from "./DbManager";
import { DbManager } from "./DbManager";

export interface MongooseDbManagerOptions extends DbManagerOptions {
    readonly mongoose: mongoose.Mongoose;
    readonly uri: string;
    readonly connectOptions?: mongoose.ConnectOptions;
}

export class MongooseDbManager extends DbManager {
    private readonly mongoose: mongoose.Mongoose;
    private readonly uri: string;
    private readonly options: mongoose.ConnectOptions;

    public constructor(options: MongooseDbManagerOptions) {
        super(options);
        this.mongoose = options.mongoose;
        this.uri = options.uri;
        this.options = {
            connectTimeoutMS: 10_000,
            ignoreUndefined: true,
            ...options.connectOptions,
        };
    }

    protected async connect(): Promise<void> {
        await this.mongoose.connect(this.uri, this.options);
    }

    protected async initialize(): Promise<void> {
        const collectionNames = new Set(
            (await this.mongoose.connection.listCollections())
                .filter((collection) => collection.type === "collection")
                .map((collection) => collection.name),
        );
        await Promise.all(
            Object.values(this.mongoose.models)
                .filter((model) => collectionNames.has(model.collection.name))
                .map((model) => model.syncIndexes()),
        );
    }

    protected async disconnect(): Promise<void> {
        await this.mongoose.disconnect();
    }
}
