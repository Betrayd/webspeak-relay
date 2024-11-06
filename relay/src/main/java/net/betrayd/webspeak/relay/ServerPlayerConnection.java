package net.betrayd.webspeak.relay;

import java.util.Map;

import org.eclipse.jetty.websocket.api.Callback;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.StatusCode;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketOpen;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.slf4j.LoggerFactory;

import net.betrayd.webspeak.relay.ServerConnection.LinkedConnection;

/**
 * The server-bound side of a player connection.
 */
@WebSocket
public class ServerPlayerConnection {

    private Session session;
    ServerConnection server;
    String sessionID;

    // store this here to handle a lot of packets fast without cpu doing map stuff.
    private ClientPlayerConnection connectedClient = null;

    /**
     * Called when the client-bound side has connected.
     * @param connectionAddress The address of the connected client.
     * @param connection The client connection.
     */
    public void connectedClient(String connectionAddress, ClientPlayerConnection connection) {
        this.connectedClient = connection;
        // We only use json once (here), so no reason to setup a whole serialization system
        this.send("relayClientConnect;{context:\"" + connectionAddress + "\"}");
    }

    /**
     * Called when the client-bound side has disconnected.
     * @param statusCode Disconnect status code.
     * @param reason Disconnect reason.
     */
    public void disconnectClient(int statusCode, String reason) {
        this.connectedClient = null;
        this.send("relayClientDisconnect;{statusCode:" + statusCode + ",reason:\"" + reason + "\"}");
    }

    /**
     * Close the connection and associated client connection.
     */
    public void disconnect() {
        session.close();
    }

    public void send(String message) {
        session.sendText(message, Callback.NOOP);
    }

    @OnWebSocketOpen
    public synchronized void onWebSocketOpen(Session session) {
        LoggerFactory.getLogger(getClass()).info("Server opened player with params: {}, server: {}",
                session.getUpgradeRequest().getQueryString(), session.getRemoteSocketAddress());
        
        this.session = session;
        
        Map<String, String> query = NetUtils.splitQueryString(session.getUpgradeRequest().getQueryString());
        String privateServerID = query.get("key");
        String publicServerID = query.get("server");

        server = WebSpeakRelay.servers.get(publicServerID);
        if (server != null && server.usesPrivateKey(privateServerID)) {
            sessionID = query.get("id");
            if (server.connections.putIfAbsent(sessionID, new LinkedConnection(this)) != null) {
                session.close(StatusCode.BAD_DATA, "Session already exists with that ID.", Callback.NOOP);
                return;
            };
        } else {
            session.close(StatusCode.BAD_DATA, "Invalid server/key pair", Callback.NOOP);
        }
    }

    // I don't know about this implementation, as the server is a client so when it
    // closes it's not going to say what we want but EH I don't actually care
    @OnWebSocketClose
    public synchronized void OnWebSocketClose(int statusCode, String reason) {
        LoggerFactory.getLogger(getClass()).info("Server player connection closed. PlayerID: {}, Server: {}", sessionID,
                session.getRemoteSocketAddress());
        
        if (this.connectedClient != null) {
            this.connectedClient.close(statusCode, reason);
            this.connectedClient = null;
        }
        // ClientPlayerConnection client;
        // synchronized(this) {
        //     client = this.connectedClient;
        //     this.connectedClient = null;
        // }

        // if (client != null) {
        //     client.close(statusCode, reason);
        // }
        server.connections.remove(sessionID);
    }

    @OnWebSocketMessage
    public void onWebSocketMessage(String message) {
        // Store for thread safety
        ClientPlayerConnection client = connectedClient;
        if (client == null) {
            return;
        }
        client.send(message);
    }
}
