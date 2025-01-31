export class UserError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "UserError";
    }
}
