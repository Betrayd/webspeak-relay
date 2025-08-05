import { ClientConnection } from "./clientConnection.ts";
import { storedPlayers } from "./index.ts";
import { generateSessionID } from "./index.ts"

export class ServerConnection {
    socket!: WebSocket;
    requestURL!: string;
    connections: Map<string, ClientConnection> = new Map<string, ClientConnection>();
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
        console.log(`server connected ${this}`);
    }

    private eventMessage(event: MessageEvent) {
        if(typeof event.data != "string")
        {
            console.error("we were sent non string data in message!");
            return;
        }
        const index = event.data.indexOf(";");
        const sessionRelay = event.data.slice(0, index);
        const data = event.data.slice(index + 1);
        if(sessionRelay.length <= 0){
            const packet = JSON.parse(data);
            if(packet == undefined || packet.type == undefined || typeof packet.type === 'string'){
                console.error("we were sent bad data for packet!");
                return;
            }
            if(packet.type === "getSessionId"){
                const sessionID = generateSessionID(this);
                this.send(';{"type":"returnSessionId","requestId":'+packet.requestId+',"id":"'+sessionID+'"}');
                return;
            }
        }
    }

    private eventClose(event: CloseEvent) {
        for (const connection of this.connections.values()) {
            connection.disconnect();
        }
        storedPlayers.removeKeysWithValue(this);
    }

}