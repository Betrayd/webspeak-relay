package net.betrayd.webspeak.relay.Servlets;

import org.eclipse.jetty.ee10.websocket.server.JettyWebSocketServlet;
import org.eclipse.jetty.ee10.websocket.server.JettyWebSocketServletFactory;

import net.betrayd.webspeak.relay.ServerConnection;

public class ServerStartServlet extends JettyWebSocketServlet {
    @Override
    protected void configure(JettyWebSocketServletFactory factory) {
        System.out.println("checking and testing");
        factory.setCreator((req, resp) -> {
            return new ServerConnection();
        });

        
    }
}
