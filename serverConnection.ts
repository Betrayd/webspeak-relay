import { ClientConnection } from "./clientConnection.ts";
import { storedPlayers } from "./index.ts";
import { generateSessionId } from "./index.ts"

export class ServerConnection {
    socket!: WebSocket;
    requestURL!: string;
    origin!: string| null;
    connections: Map<string, ClientConnection> = new Map<string, ClientConnection>();
    constructor(socket: WebSocket, requestURL: string, origin: string | null) {
        socket.addEventListener("open", this);
        socket.addEventListener("message", this);
        socket.addEventListener("close", this);
        this.requestURL = requestURL;
        this.socket = socket;
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
        this.socket.send(message);
    }

    private eventOpen() {
        if (this.origin == null) {
            this.socket.close(1002, "No origin");
            console.warn("Server connecting had no origin");
            return;
        }
        console.log(`server connected ${this.origin}`);
    }

    private eventMessage(event: MessageEvent) {
        const eventData = event.data;
        if(typeof eventData != "string")
        {
            console.warn(`[${this.origin}]: Server sent non string data in message!`);
            return;
        }
        const index = eventData.indexOf(";");
        if(index < 0 || index >= eventData.length){
            console.warn(`[${this.origin}]: server sent bad data!`);
            return;
        }
        const sessionRelay = eventData.slice(0, index);
        const data = eventData.slice(index + 1);

        if(sessionRelay.length > 0){
            this.relayPacket(sessionRelay, data);
            return;    
        }
        
        let packet = undefined;
        try{
            packet = JSON.parse(data);
            if(packet == undefined || packet.type == undefined || typeof packet.type != "string"){
                console.warn(`[${this.origin}]: we were sent bad data for packet!`);
                return;
            }
            if(packet.type === "getSessionId"){
                this.handleGetSessionId(packet.requestId);
                return;
            }
            if(packet.type === "releaseSessionId"){
                this.handleReleaseSessionId(packet.id, packet.statusCode, packet.reason);
                return;
            }
            if(packet.type === "disconnectClient"){
                this.handleDisconnectClient(packet.id, packet.statusCode, packet.reason);
                return;
            }
        }
        catch(error){
            console.warn(`[${this.origin}]: could not read packet`, error);
            return;
        }
    }

    private eventClose(_event: CloseEvent) {
        for (const connection of this.connections.values()) {
            connection.disconnect(1001, "Webspeak server closed");
        }
        storedPlayers.removeKeysWithValue(this);
        
        console.log(`server closed ${this.origin}`);
    }

    relayPacket(sessionId: string, packet: string){
        if(!this.connections.has(sessionId)){
            console.warn(`[${this.origin}]: server trying to send data client not connected to it's server`);
            return;
        }
        const client = this.connections.get(sessionId);
        client?.send(packet);
    }

    private handleGetSessionId(requestId?: number){
        const sessionId = generateSessionId(this);
        this.sendReturnSessionId(requestId, sessionId);
    }

    private handleReleaseSessionId(id?: string, statusCode?: number, reason?: string){
        if(id == undefined){
            return;
        }
        if(this.disconnectClient(id, statusCode, reason)){
            storedPlayers.removeByKey(id);
        }
    }

    private handleDisconnectClient(id?: string, statusCode?: number, reason?: string){
        if(id == undefined){
            return;
        }
        this.disconnectClient(id, statusCode, reason);
    }

    private sendReturnSessionId(requestId?: number, sessionId?: string){
        this.send(';{"type":"returnSessionId","requestId":'+requestId+',"id":"'+sessionId+'"}');
    }

    private sendAddedClient(sessionId?: string){
        this.send(';{"type":"addedClient","id":"'+sessionId+'"}');
    }

    private sendClosedClient(sessionId?: string, statusCode?: number, reason?: string){
        this.send(';{"type": "closedClient","id": "'+sessionId+'","statusCode": '+statusCode+',"reason": "'+reason+'"}');
    }

    public clientConnected(client: ClientConnection): boolean{
        if(client.sessionId == undefined || this.connections.has(client.sessionId)){
            return false;
        }

        const sessionId = client.sessionId;

        this.connections.set(sessionId, client);
        this.sendAddedClient(sessionId);
        return true;
    }

    public clientDisconnected(session: string, statusCode: number, reason: string){
        if(this.socket.OPEN){
            this.sendClosedClient(session, statusCode, reason);
        }
        this.connections.delete(session);
    }

    public disconnectClient(session: string, statusCode?: number, reason?: string): boolean{
        if(!this.connections.has(session)){
            return false;
        }
        const client = this.connections.get(session);
        
        client?.disconnect(statusCode, reason);

        return true;
    }
}