import {ServerPlayerConnection} from "./serverPlayerConnection.ts";
import {ClientPlayerConnection} from "./clientPlayerConnection.ts";

export class LinkedConnection {
    public serverConnection: ServerPlayerConnection;
    public clientConnection!: ClientPlayerConnection;

    constructor(serverConnection: ServerPlayerConnection ) {
        this.serverConnection = serverConnection;
    }
}