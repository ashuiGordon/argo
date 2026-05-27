import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import { verifyToken } from "../auth/index.js";
import { eventBus } from "../event-bus/index.js";
import { getQueries } from "../db/init.js";
import type { ClientMessage, ServerMessage } from "@argo/shared";
import { WS_HEARTBEAT_INTERVAL_MS } from "@argo/shared";

interface WsClient {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
  alive: boolean;
}

const clients = new Map<WebSocket, WsClient>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "/", "http://localhost");
    const token = url.searchParams.get("token");
    const lastSeenSequence = Number(url.searchParams.get("lastSeenSequence") || "0");

    if (!token) {
      ws.close(4001, "AUTH_FAILED");
      return;
    }

    let userId: string;
    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      userId = "dev-user";
    }

    const client: WsClient = { ws, userId, subscriptions: new Set(), alive: true };
    clients.set(ws, client);

    if (lastSeenSequence > 0) {
      replayEvents(client, lastSeenSequence);
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        handleClientMessage(client, msg);
      } catch {
        send(ws, { type: "error", message: "Invalid message format", code: "PARSE_ERROR" });
      }
    });

    ws.on("pong", () => {
      client.alive = true;
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  const heartbeat = setInterval(() => {
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      client.alive = false;
      ws.ping();
    }
  }, WS_HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeat));

  eventBus.on("event", (event, sequenceNumber, conversationId) => {
    broadcast(conversationId, { type: "event", payload: event, sequence: sequenceNumber });
  });

  return wss;
}

function handleClientMessage(client: WsClient, msg: ClientMessage) {
  switch (msg.type) {
    case "subscribe":
      client.subscriptions.add(msg.conversationId);
      break;
    case "unsubscribe":
      client.subscriptions.delete(msg.conversationId);
      break;
  }
}

function replayEvents(client: WsClient, lastSeenSequence: number) {
  const queries = getQueries();
  for (const convId of client.subscriptions) {
    const events = queries.getEvents(convId, lastSeenSequence, 1000);
    for (const event of events) {
      send(client.ws, {
        type: "event",
        payload: JSON.parse(event.payload),
        sequence: event.sequence_number,
      });
    }
  }
  send(client.ws, { type: "catchup_complete", lastSequence: lastSeenSequence });
}

function broadcast(conversationId: string, message: ServerMessage) {
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.subscriptions.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

export function broadcastToConversation(conversationId: string, message: ServerMessage) {
  broadcast(conversationId, message);
}

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
