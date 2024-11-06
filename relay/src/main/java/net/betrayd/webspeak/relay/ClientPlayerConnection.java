package net.betrayd.webspeak.relay;

import org.eclipse.jetty.websocket.api.Callback;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.StatusCode;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketOpen;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;

import net.betrayd.webspeak.relay.ServerConnection.LinkedConnection;

/**
 * The client-bound side of a player connection.
 */
@WebSocket
public class ClientPlayerConnection {
    private Session session;

    // store this here to handle a lot of packets fast without cpu doing map stuff.
    private ServerPlayerConnection serverConnection = null;
    private final String serverID;

    public ClientPlayerConnection(String server) {
        this.serverID = server;
    }

    public void send(String message) {
        session.sendText(message, Callback.NOOP);
    }

    public void close(int statusCode, String reason) {
        session.close(statusCode, reason, Callback.NOOP);
    }

    @OnWebSocketOpen
    public synchronized void onWebSocketOpen(Session session) {
        if (this.serverID == null) {
            session.close(StatusCode.BAD_DATA, "No server ID was supplied.", Callback.NOOP);
            return;
        }

        this.session = session;

        ServerConnection server = WebSpeakRelay.servers.get(serverID);
        if (server == null) {
            session.close(StatusCode.BAD_DATA,
                    "The server being connected to does not exist",Callback.NOOP);
            return;
        }
        String sessionID = NetUtils.splitQueryString(session.getUpgradeRequest().getQueryString()).get("id");
        LinkedConnection link = server.connections.get(sessionID);

        if (link == null) {
            session.close(StatusCode.BAD_PAYLOAD, "No player exists with session ID " + sessionID, Callback.NOOP);
        }
        serverConnection = link.serverConnection;
        serverConnection.connectedClient(session.getRemoteSocketAddress().toString(), this);
        link.clientConnection = this;
    }

    @OnWebSocketClose
    public synchronized void onWebSocketClose(int statusCode, String reason) {
        if (serverConnection == null) {
            return;
        }
        serverConnection.disconnectClient(statusCode, reason);
    }

    @OnWebSocketMessage
    public void onWebSocketMessage(Session session, String message) {
        this.serverConnection.send(message);
    }
}
