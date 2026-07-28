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
                            console.error(`[${this.origin}]: Client sent non string data in message!`);
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
        //wrap this in a socket.isOpen to stop potential crashes. leave it here to find the root cause by looking at the stack trace when it crashes
        if(this.socket.readyState == WebSocket.OPEN){
            this.socket.send(message);
        }
    }

    private eventOpen() {
        if (this.origin == null) {
            this.socket.close(1002, "No origin");
            console.warn("Client connecting had no origin");
            return;
        }

        const sessionId = new URL(this.requestURL).searchParams.get("id");
        if (sessionId == null) {
            this.socket.close(1002, "No session ID was supplied.");
            console.warn(`[${this.origin}]: Client connecting had no session ID was supplied.`);
            return;
        }

        const serverConnection = storedPlayers.getByKey(sessionId);
        if (serverConnection == undefined) {
            this.socket.close(1002, "No server assosiated with the session ID");
            console.warn(`[${this.origin}]: Client connecting had no server assosiated with the session ID`);
            return;
        }
        
        this.sessionId = sessionId;
        this.serverConnection = serverConnection;
        
        //add the player to the server disconnect the client otherwise. Don't inform the server
        if(!this.serverConnection.clientConnected(this)){
            this.socket.close(1008, "Client Already Connected");
            console.warn(`[${this.origin}]: Client connecting using already connected session ID`);
            return;
        }

        console.log(`client connected ${this.origin}`);
    }

    private eventMessage(event: MessageEvent) {
        this.relayPacket(event.data);
    }

    private eventClose(event: CloseEvent) {
        if (this.serverConnection == null) { return; }
        this.serverConnection.clientDisconnected(this.sessionId, event.code, event.reason);

        console.log(`client closed ${this.origin}`);
    }

    relayPacket(packet: string){
        if (this.serverConnection == null) { return; }
        this.serverConnection.send(this.sessionId+";"+packet);
    }
}