import { LinkedConnection } from "./linkedConnection.ts";
import { servers } from "./index.ts";

export class ServerConnection {
    socket!: WebSocket;
    requestURL!: string;
    privateID: string | null = null;
    publicID: string | null = null;
    connections: Map<string, LinkedConnection> = new Map<string, LinkedConnection>();
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

    private eventMessage(event: MessageEvent) {
        if (event.data.length > 0) { this.establishSessionID(event.data) }
    }

    private establishSessionID(ID: string) {
        if (this.publicID != null) {
            console.error("This session already has an ID.");
            return;
        }
        if (servers.has(ID)) {
            this.disconnect(1002, "There is already a server using this ID.");
            console.error("There is already a server using this ID.");
            return;
        }
        servers.set(ID, this);
        this.publicID = ID;
        if (this.privateID != null) {
            this.send(this.privateID);
        }
        console.log("server chose public id:", ID);
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