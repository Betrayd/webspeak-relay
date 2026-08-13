import { MultiElementBiMap } from './multiElementBiMap.ts';
import { ServerConnection } from './serverConnection.ts';
import { ClientConnection } from './clientConnection.ts';

const SERVER_CONNECTION_ROUTE = new URLPattern({ pathname: "/host" });
const CLIENT_CONNECTION_ROUTE = new URLPattern({ pathname: "/join" });

export const storedPlayers: MultiElementBiMap<string, ServerConnection> = new MultiElementBiMap<string, ServerConnection>();

export function checkSessionId(serverid : string, server : ServerConnection): boolean {
    if(storedPlayers.hasKey(serverid)){
      return false;
    }
    storedPlayers.add(serverid, server);
    return true;
}

const handler = (request: Request, connInfo: Deno.ServeHandlerInfo<Deno.Addr>): Response => {
  if (request.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  function assertIsNetAddr(addr: Deno.Addr): asserts addr is Deno.NetAddr {
    if (!['tcp', 'udp'].includes(addr.transport)) {
      throw new Error('Not a network address');
    }
  }

  function getRemoteAddress(connInfo: Deno.ServeHandlerInfo<Deno.Addr>): Deno.NetAddr {
    assertIsNetAddr(connInfo.remoteAddr);
    return connInfo.remoteAddr;
  }

  const matchRelay: URLPatternResult | null = CLIENT_CONNECTION_ROUTE.exec(request.url);
  if (SERVER_CONNECTION_ROUTE.exec(request.url)) {
    const { socket, response } = Deno.upgradeWebSocket(request);
    new ServerConnection(socket, request.url, getRemoteAddress(connInfo).hostname);
    return response;
  }
  else if (matchRelay) {
    const { socket, response } = Deno.upgradeWebSocket(request);
    new ClientConnection(socket, request.url, getRemoteAddress(connInfo).hostname);
    return response;
  }

  return new Response(null, { status: 404 });
};

Deno.serve({ port: 8080 }, handler);