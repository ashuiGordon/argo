import { WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from "@argo/shared";
import type { ServerMessage, ClientMessage } from "@argo/shared";
import { useAuthStore } from "../stores/auth";

type MessageHandler = (msg: ServerMessage) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private lastSeenSequence = 0;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const url = `ws://${window.location.hostname}:54321/ws?token=${token}&lastSeenSequence=${this.lastSeenSequence}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      if (msg.type === "event" && msg.sequence > this.lastSeenSequence) {
        this.lastSeenSequence = msg.sequence;
      }
      for (const handler of this.handlers) {
        handler(msg);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(conversationId: string) {
    this.send({ type: "subscribe", conversationId });
  }

  unsubscribe(conversationId: string) {
    this.send({ type: "unsubscribe", conversationId });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onPtyOutput(sessionId: string, handler: (data: string) => void) {
    const msgHandler: MessageHandler = (msg) => {
      if (msg.type === "pty_output" && msg.sessionId === sessionId) {
        handler(msg.data);
      }
    };
    this.handlers.add(msgHandler);
    return () => this.handlers.delete(msgHandler);
  }

  private scheduleReconnect() {
    const delay = Math.min(
      WS_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      WS_RECONNECT_MAX_MS,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

export const wsClient = new WsClient();
