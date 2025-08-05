import { ClientPlayerConnection } from "./clientPlayerConnection.ts";
import { ServerConnection } from "./serverConnection.ts";
import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ServerPlayerConnection {
    socket!: WebSocket;
    requestURL!: string;
    server!: ServerConnection | undefined;
    sessionID: string | null = null;
    private connectedClient: ClientPlayerConnection | null = null;
    constructor(socket: WebSocket, requestURL: string) {
        socket.addEventListener("open", this);
        socket.addEventListener("message", this);
        socket.addEventListener("close", this);
        this.requestURL = requestURL;
        this.socket = socket;
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

    public connectClient(connectionAddress: string, connection: ClientPlayerConnection) {
        this.connectedClient = connection;
        this.socket.send("relayClientConnect;{context:\"" + connectionAddress + "\"}");
    }

    public disconnectClient(statusCode: number, reason: string) {
        this.connectedClient = null;
        this.socket.send("relayClientDisconnect;{statusCode:" + statusCode + ",reason:\"" + reason + "\"}");
    }

    public disconnect(code?: number, reason?: string) {
        this.socket.close(code, reason);
    }

    public send(message: string) {
        this.socket.send(message);
    }

    private eventOpen() {
        const params: URLSearchParams = new URL(this.requestURL).searchParams;
        const privateServerID = params.get("key");
        const publicServerID = params.get("server");
        this.sessionID = params.get("id");

        console.log("Server opened player with id: ", this.sessionID, "server:", publicServerID);

        if (publicServerID == null || privateServerID == null || this.sessionID == null) {
            this.disconnect(1002, "Not correct parameters");
            console.error("Not correct parameters");
            return;
        }
        this.server = servers.get(publicServerID);
        if (this.server != undefined && this.server.usesPrivateKey(privateServerID)) {
            if (this.server.connections.has(this.sessionID)) {
                this.disconnect(1002, "Session already exists with that ID.");
                return
            }
            this.server.connections.set(this.sessionID, new LinkedConnection(this));
        }
        else {
            this.disconnect(1002, "Invalid server/key pair");
        }

    }

    private eventMessage(event: MessageEvent<string>) {
        const client: ClientPlayerConnection | null = this.connectedClient;
        if (client == null) {
            return;
        }
        client.send(event.data);
    }

    private eventClose(event: CloseEvent) {
        if (this.connectedClient != null) {
            this.connectedClient.disconnect(event.code, event.reason);
            this.connectedClient = null;
        }
        if (this.server != undefined && this.sessionID != null) {
            this.server.connections.delete(this.sessionID);
        }
    }

}