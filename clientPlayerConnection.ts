import { ServerPlayerConnection } from "./serverPlayerConnection.ts";
import { ServerConnection } from "./serverConnection.ts";
import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ClientPlayerConnection {

    socket!: WebSocket;
    requestURL!: string;
    serverID!: string | undefined;
    serverConnection: ServerPlayerConnection | null = null;
    origin!: string| null;

    constructor(socket: WebSocket, requestURL: string, server: string | undefined, origin: string | null) {
        socket.addEventListener("open", this);
        socket.addEventListener("message", this);
        socket.addEventListener("close", this);
        this.socket = socket;
        this.requestURL = requestURL;
        this.serverID = server;
        this.origin = origin;
    }

    handleEvent(event: Event) 
    {
        switch(event.type)
        {
            case "open":
                this.eventOpen();
                break;
            case "message":
                if(event instanceof MessageEvent)
                    {
                        if(typeof event.data != "string")
                        {
                            Error("we were sent non string data in message!");
                            return;
                        }
                        this.eventMessage(event);
                    }
                break;
            case "close":
                if(event instanceof CloseEvent)
                {
                    this.eventClose(event);
                }
                break;
        }
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
            console.error("No server ID was supplied.");
            return;
        }

        const server: ServerConnection | undefined = servers.get(this.serverID);
        if (server == undefined) {
            this.socket.close(1002, "The server being connected to does not exist");
            console.error("The server being connected to does not exist");
            return;
        }

        const sessionID = new URL(this.requestURL).searchParams.get("id");
        if (sessionID == null) {
            this.socket.close(1002, "No ID provided");
            console.error("No ID provided");
            return;
        }
        const link: LinkedConnection | undefined = server.connections.get(sessionID);
        if (link == undefined) {
            this.socket.close(1002, "No player exists with session ID " + sessionID);
            console.error("No player exists with session ID " + sessionID);
            return;
        }
        this.serverConnection = link.serverConnection;
        if (this.origin == null) {
            this.socket.close(1002, "No origin");
            console.error("No origin");
            return;
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