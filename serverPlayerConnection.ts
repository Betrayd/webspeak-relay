import { ClientPlayerConnection } from "./clientPlayerConnection.ts";
import { ServerConnection } from "./serverConnection.ts";
import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ServerPlayerConnection {
    socket!: WebSocket;
    server!: ServerConnection | undefined;
    sessionID: string | null = null;
    private connectedClient: ClientPlayerConnection | null = null;
    constructor(socket: WebSocket) {
        socket.addEventListener("open", this.eventOpen);
        socket.addEventListener("message", this.eventMessage);
        socket.addEventListener("close", this.eventClose);
        this.socket = socket;
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
        const params: URLSearchParams = new URL(this.socket.url).searchParams;
        const privateServerID = params.get("key");
        const publicServerID = params.get("server");
        this.sessionID = params.get("id");
        if (publicServerID == null || privateServerID == null || this.sessionID == null) {
            this.disconnect(1002, "Not correct parameters");
            throw new Error("Not correct parameters");
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