"use client";

import type { HlWsSubscription, HlWsMessage } from "./types";

const HL_WS_URL = "wss://api.hyperliquid.xyz/ws";

type MessageHandler = (data: unknown) => void;

export class HyperliquidWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private intentionallyClosed = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private subscriptions: HlWsSubscription[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentionallyClosed = false;
      this.ws = new WebSocket(HL_WS_URL);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.startPing();
        // Re-subscribe after reconnect
        this.subscriptions.forEach((sub) => this.sendSubscription(sub));
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: HlWsMessage = JSON.parse(event.data as string);
          const handlers = this.handlers.get(msg.channel);
          if (handlers) {
            handlers.forEach((h) => h(msg.data));
          }
        } catch {
          // Ignore parse errors (ping/pong etc.)
        }
      };

      this.ws.onclose = () => {
        this.stopPing();
        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        reject(err);
      };
    });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: "ping" }));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
      this.connect().catch(() => {});
    }, this.reconnectDelay);
  }

  private sendSubscription(subscription: HlWsSubscription) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ method: "subscribe", subscription })
      );
    }
  }

  subscribe(subscription: HlWsSubscription, handler: MessageHandler): () => void {
    // Track subscriptions for reconnect
    if (!this.subscriptions.find((s) => JSON.stringify(s) === JSON.stringify(subscription))) {
      this.subscriptions.push(subscription);
    }

    const channel = subscription.type;
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
    this.sendSubscription(subscription);

    // Return unsubscribe fn
    return () => {
      this.handlers.get(channel)?.delete(handler);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({ method: "unsubscribe", subscription })
        );
      }
      this.subscriptions = this.subscriptions.filter(
        (s) => JSON.stringify(s) !== JSON.stringify(subscription)
      );
    };
  }

  close() {
    this.intentionallyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for the app
let hlWs: HyperliquidWebSocket | null = null;

export function getHlWebSocket(): HyperliquidWebSocket {
  if (!hlWs) {
    hlWs = new HyperliquidWebSocket();
  }
  return hlWs;
}
