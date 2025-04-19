import { ServerConnection } from './serverConnection.ts';
import {ServerPlayerConnection} from "./serverPlayerConnection.ts";
import {ClientPlayerConnection} from "./clientPlayerConnection.ts";

const SERVER_CONNECTION_ROUTE = new URLPattern({ pathname: "/host" });
const ADD_PLAYER_ROUTE = new URLPattern({ pathname: "/addplayer" });
const CLIENT_CONNECTION_ROUTE = new URLPattern({ pathname: "/relay/:serverid/:sessionid" });


export const servers: Map<string, ServerConnection> = new Map<string, ServerConnection>();

const handler = (request: Request, connInfo: Deno.ServeHandlerInfo<Deno.Addr>): Response => {
  if (request.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  function assertIsNetAddr (addr: Deno.Addr): asserts addr is Deno.NetAddr {
    if (!['tcp', 'udp'].includes(addr.transport)) {
      throw new Error('Not a network address');
    }
  }

  function getRemoteAddress (connInfo: Deno.ServeHandlerInfo<Deno.Addr>): Deno.NetAddr {
    assertIsNetAddr(connInfo.remoteAddr);
    return connInfo.remoteAddr;
  }

  const matchRelay: URLPatternResult | null  = CLIENT_CONNECTION_ROUTE.exec(request.url);
  if (SERVER_CONNECTION_ROUTE.exec(request.url)) {
    const { socket, response } = Deno.upgradeWebSocket(request);
    new ServerConnection(socket);
    return response;
  }
  else if (ADD_PLAYER_ROUTE.exec(request.url)) {
    const { socket, response } = Deno.upgradeWebSocket(request);
    new ServerPlayerConnection(socket);
    return response;
  }
  else if (matchRelay) {
    const { socket, response } = Deno.upgradeWebSocket(request);
    new ClientPlayerConnection(socket, matchRelay.pathname.groups.serverid, getRemoteAddress(connInfo).hostname);
    return response;
  }

  return new Response(null, { status: 404 });
};

Deno.serve(handler);