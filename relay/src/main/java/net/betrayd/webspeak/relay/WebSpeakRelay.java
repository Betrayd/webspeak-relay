package net.betrayd.webspeak.relay;

import java.lang.Exception;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.eclipse.jetty.ee10.servlet.ServletContextHandler;
import org.eclipse.jetty.ee10.servlet.ServletHolder;
import org.eclipse.jetty.ee10.websocket.server.config.JettyWebSocketServletContainerInitializer;
import org.eclipse.jetty.server.Server;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.betrayd.webspeak.relay.Servlets.ClientServlet;
import net.betrayd.webspeak.relay.Servlets.ServerAddPlayerServlet;
import net.betrayd.webspeak.relay.Servlets.ServerStartServlet;

public class WebSpeakRelay {

    private static final Logger LOGGER = LoggerFactory.getLogger(WebSpeakRelay.class);
    public static final Map<String, ServerConnection> servers = new ConcurrentHashMap<>();

    public static void main(String[] args) throws Exception {
        start(8080);
    }

    private static Server jettyServer;

    public static void start(int port) throws Exception {
        
        LOGGER.info("Starting relay server...");
        if (jettyServer != null) {
            throw new IllegalStateException("Server has already started.");
        }

        var server = jettyServer = new Server(port);

        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        server.setHandler(context);

        JettyWebSocketServletContainerInitializer.configure(context, null);

        ServletHolder wsHostHolder = new ServletHolder("host", new ServerStartServlet());
        context.addServlet(wsHostHolder, "/host");
        ServletHolder wsConnectionHolder = new ServletHolder("addplayer", new ServerAddPlayerServlet());
        context.addServlet(wsConnectionHolder, "/addplayer");
        ServletHolder wsClientHolder = new ServletHolder("connect", new ClientServlet());
        context.addServlet(wsClientHolder, "/relay/*");

        server.start();
        jettyServer = server;
        LOGGER.info("Relay server started!");
    }
}
