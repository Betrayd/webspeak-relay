import { ServerPlayerConnection } from "./serverPlayerConnection.ts";
import { ServerConnection } from "./serverConnection.ts";
import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ClientPlayerConnection {

    socket!: WebSocket;
    serverID!: string | undefined;
    serverConnection: ServerPlayerConnection | null = null;
    origin!: string| null;

    constructor(socket: WebSocket, server: string | undefined, origin: string | null) {
        socket.addEventListener("open", this.eventOpen);
        socket.addEventListener("message", this.eventMessage);
        socket.addEventListener("close", this.eventClose);
        this.socket = socket;
        this.serverID = server;
        this.origin = origin;
    }

    public disconnect(code?: number, reason?: string) {
        this.socket.close(code, reason);
    }

    public send(message: string) {
        this.socket.send(message);
    }

    private eventOpen() {
        if (this.serverID == null) {
            this.socket.close(1002, "No server ID was supplied.");
            throw new Error("No server ID was supplied.");
        }

        const server: ServerConnection | undefined = servers.get(this.serverID);
        if (server == undefined) {
            this.socket.close(1002, "The server being connected to does not exist");
            throw new Error("The server being connected to does not exist");
        }

        const sessionID = new URL(this.socket.url).searchParams.get("id");
        if (sessionID == null) {
            this.socket.close(1002, "No ID provided");
            throw new Error("No ID provided");
        }
        const link: LinkedConnection | undefined = server.connections.get(sessionID);
        if (link == undefined) {
            this.socket.close(1002, "No player exists with session ID " + sessionID);
            throw new Error("No player exists with session ID " + sessionID);
        }
        this.serverConnection = link.serverConnection;
        if (this.origin == null) {
            this.socket.close(1002, "No origin");
            throw new Error("No origin");
        }
        this.serverConnection.connectClient(this.origin, this);
        link.clientConnection = this;
    }

    private eventMessage(event: MessageEvent<string>) {
        if (this.serverConnection == null) { return; }
        this.serverConnection.send(event.data);
    }

    private eventClose(event: CloseEvent) {
        if (this.serverConnection == null) { return; }
        this.serverConnection.disconnectClient(event.code, event.reason);
    }

}