import { ServerConnection } from "./serverConnection.ts";
import { storedPlayers } from "./index.ts"

export class ClientConnection {
    socket!: WebSocket;
    requestURL!: string;
    sessionId!: string;
    serverConnection!: ServerConnection;
    origin!: string| null;

    constructor(socket: WebSocket, requestURL: string, origin: string | null) {
        socket.addEventListener("open", this);
        socket.addEventListener("message", this);
        socket.addEventListener("close", this);
        this.socket = socket;
        this.requestURL = requestURL;
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
                            console.error("we were sent non string data in message!");
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
        console.log(`client connected ${this}`);
        const sessionId = new URL(this.requestURL).searchParams.get("id");
        if (sessionId == null) {
            this.socket.close(1002, "No session ID was supplied.");
            console.error("No session ID was supplied.");
            return;
        }

        const serverConnection = storedPlayers.getByKey(sessionId);
        if (serverConnection == undefined) {
            this.socket.close(1002, "No server assosiated with the session ID");
            console.error("No server assosiated with the session ID");
            return;
        }

        if (this.origin == null) {
            this.socket.close(1002, "No origin");
            console.error("No origin");
            return;
        }
        
        this.sessionId = sessionId;
        this.serverConnection = serverConnection;
        
        //this needs to update the map if we are allowed to connect
        //this.serverConnection.connectClient(this.origin, this);
    }

    private eventMessage(event: MessageEvent) {
        if (this.serverConnection == null) { return; }
        return;
    }

    private eventClose(event: CloseEvent) {
        if (this.serverConnection == null) { return; }
        //this.server.discconectClient();
    }

}