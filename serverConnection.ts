import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ServerConnection {
    socket!: WebSocket;
    privateID: string | null = null;
    publicID: string | null = null;
    connections: Map<string, LinkedConnection> = new Map<string, LinkedConnection>();
    constructor(socket: WebSocket) {
        socket.addEventListener("open", this.eventOpen);
        socket.addEventListener("message", this.eventMessage);
        socket.addEventListener("close", this.eventClose);
        this.socket = socket;
    }

    public usesPrivateKey(testID: string): boolean {
        return this.privateID != null && this.privateID === testID;
    }

    public disconnect(code?: number, reason?: string) {
        this.socket.close(code, reason);
    }

    public send(message: string) {
        this.socket.send(message);
    }

    private eventOpen() {
        this.privateID = crypto.randomUUID();
        console.log(`server connected ${this}`);
    }

    private eventMessage(event: MessageEvent<string>) {
        if (event.data.length > 0) { this.establishSessionID(event.data) }
    }

    private establishSessionID(ID: string) {
        if (this.publicID != null) {
            throw new Error("This session already has an ID.");
        }
        if (servers.has(ID)) {
            this.disconnect(1002, "There is already a server using this ID.");
            throw new Error("There is already a server using this ID.");
        }
        servers.set(ID, this);
        this.publicID = ID;
        if (this.privateID != null) {
            this.send(this.privateID);
        }
    }

    private eventClose(event: CloseEvent) {
        for (const connection of this.connections.values()) {
            connection.serverConnection.disconnect();
        }
        this.connections.clear();
        if (this.publicID != null) {
            servers.delete(this.publicID);
        }
    }

}