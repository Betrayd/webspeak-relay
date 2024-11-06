package net.betrayd.webspeak.relay.Servlets;

import org.eclipse.jetty.ee10.websocket.server.JettyWebSocketServlet;
import org.eclipse.jetty.ee10.websocket.server.JettyWebSocketServletFactory;

import net.betrayd.webspeak.relay.ClientPlayerConnection;

public class ClientServlet extends JettyWebSocketServlet {

    @Override
    protected void configure(JettyWebSocketServletFactory factory) {
        factory.setCreator((req, resp) -> {
            //don't need a check here we already made sure that the path contained a / to get here
            String[] path = req.getRequestPath().split("/");
            String server = null;
            if(path.length > 3)
            {
                server = path[2];
            }
            System.out.println("client asking for server: "+server);
            return new ClientPlayerConnection(server);
        });
    }
    
}
