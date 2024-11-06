package net.betrayd.webspeak.relay;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.eclipse.jetty.websocket.api.Callback;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketOpen;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A "main" connection between the server and client. Acts as a server instance
 * in the context of the relay.
 */
@WebSocket
public class ServerConnection {

    private static final Logger LOGGER = LoggerFactory.getLogger(ServerConnection.class);

    private String privateID = null;
    private String publicID = null;

    public final Map<String, LinkedConnection> connections = new ConcurrentHashMap<>();

    public boolean usesPrivateKey(String testID) {
        return privateID != null && privateID.equals(testID);
    }

    @OnWebSocketOpen
    public void onWebSocketOpen(Session session) {
        LOGGER.info("New server connecting to the relay: {}", this);
        // generate the connecting server's private ID
        // Probably could be reverse engineered by getting a lot of keys by connecting a
        // lot and then using those to figure out an internal state, but if it gets big
        // enough people care to do that I consider it a win
        privateID = UUID.randomUUID().toString();
    }

    // we need to ask what the server what it's public identifier is. We will return
    // with it's private identifier
    @OnWebSocketMessage
    public void onWebSocketMessage(Session session, String message) {

        // I'm not using the whole packet system fot this. Use their message as their
        // ID. Blank is keep alive
        if (message.length() > 0) {
            establishSessionID(session, message);
        }
    }

    private synchronized void establishSessionID(Session session, String ID) {
        if (publicID != null) {
            throw new IllegalStateException("This session already has an ID.");
        }   
        // putIfAbsent will return non-null if there was already a value.
        if (WebSpeakRelay.servers.putIfAbsent(ID, this) != null) {
            throw new IllegalStateException("There is already a server using this ID.");
        }
        this.publicID = ID;
        session.sendText(privateID, Callback.NOOP);
    }

    @OnWebSocketClose
    public void onWebSocketClose(int statusCode, String message) {
        for (LinkedConnection con : connections.values()) {
            con.serverConnection.disconnect();
        }
        connections.clear();
        WebSpeakRelay.servers.remove(publicID);

        LOGGER.info("Server disconnected: {}", this);
    }

    public static class LinkedConnection {
        public LinkedConnection(ServerPlayerConnection serverConnection) {
            this.serverConnection = serverConnection;
        }

        public final ServerPlayerConnection serverConnection;
        public ClientPlayerConnection clientConnection;
    }
}
