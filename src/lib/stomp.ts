/**
 * STOMP WebSocket manager — 对齐 cloudManagement / 旧项目实现。
 *
 * - @stomp/stompjs Client + SockJS
 * - connectHeaders 在每次连接前动态读取 token
 * - 关闭 STOMP 心跳，由 SockJS 维持连接
 * - URL: /api/register-app/socket（经 vite proxy 转发）
 */
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAuthToken } from "@/lib/auth-token";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface SubscriptionConfig {
  destination: string;
  headers?: Record<string, string>;
}

export type MessageListener = (message: unknown) => void;

interface GlobalListeners {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

interface SubscriptionRecord {
  id: string;
  destination: string;
  subscription: StompSubscription;
  listener: MessageListener;
}

type StatusListener = (status: ConnectionStatus) => void;

class StompManager {
  private client: Client | null = null;
  private readonly socketUrl = "/api/register-app/socket";
  private readonly reconnectDelay = 5000;
  private globalListeners: GlobalListeners = {};
  private subscriptions = new Map<string, SubscriptionRecord>();
  private pendingSubscriptions = new Map<
    string,
    { config: SubscriptionConfig; listener: MessageListener }
  >();
  private statusListeners = new Set<StatusListener>();
  private onReceiveHandler: ((msg: unknown) => void) | null = null;

  private _status: ConnectionStatus = "disconnected";
  private stats = {
    messageCount: 0,
    errorCount: 0,
    reconnectCount: 0,
  };

  get status(): ConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === "connected";
  }

  get isConnecting(): boolean {
    return ["connecting", "reconnecting"].includes(this._status);
  }

  getStats() {
    return { ...this.stats };
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this._status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(next: ConnectionStatus): void {
    this._status = next;
    this.statusListeners.forEach((listener) => listener(next));
  }

  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private createClient(): Client {
    const client = new Client({
      webSocketFactory: () => new SockJS(this.socketUrl) as unknown as WebSocket,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      reconnectDelay: this.reconnectDelay,
      onConnect: () => {
        this.setStatus("connected");
        this.globalListeners.onConnect?.();
        this.flushPendingSubscriptions();
      },
      onDisconnect: () => {
        this.setStatus("disconnected");
        this.globalListeners.onDisconnect?.();
      },
      onWebSocketClose: () => {
        this.setStatus("disconnected");
      },
      onWebSocketError: (error) => {
        this.setStatus("error");
        this.stats.errorCount++;
        this.globalListeners.onError?.(error);
      },
      onStompError: (frame) => {
        this.setStatus("error");
        this.stats.errorCount++;
        this.globalListeners.onError?.({
          message: frame.headers["message"],
          body: frame.body,
        });
      },
    });

    client.beforeConnect = () => {
      client.connectHeaders = { Authorization: getAuthToken() };
    };

    return client;
  }

  connect(): void {
    if (this.client?.connected) return;
    if (this.client) {
      try {
        void this.client.deactivate();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
    this.setStatus("connecting");
    this.client = this.createClient();
    void this.client.activate();
  }

  private flushPendingSubscriptions(): void {
    this.pendingSubscriptions.forEach((pending, id) => {
      try {
        this.subscribeInternal(id, pending.config, pending.listener);
        this.pendingSubscriptions.delete(id);
      } catch {
        /* ignore */
      }
    });
  }

  private subscribeInternal(
    id: string,
    config: SubscriptionConfig,
    listener: MessageListener,
  ): void {
    if (!this.client?.connected) throw new Error("STOMP not connected");
    const subscription = this.client.subscribe(
      config.destination,
      (msg: IMessage) => {
        this.stats.messageCount++;
        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.body);
        } catch {
          parsed = msg.body;
        }
        if (this.onReceiveHandler) {
          try {
            this.onReceiveHandler(parsed);
          } catch {
            /* ignore */
          }
        }
        listener(parsed);
      },
      config.headers,
    );
    this.subscriptions.set(id, {
      id,
      destination: config.destination,
      subscription,
      listener,
    });
  }

  subscribe(config: SubscriptionConfig, listener: MessageListener): string {
    const id = this.generateId();
    if (this.client?.connected) {
      this.subscribeInternal(id, config, listener);
    } else {
      this.pendingSubscriptions.set(id, { config, listener });
    }
    return id;
  }

  unsubscribe(id: string): void {
    if (this.pendingSubscriptions.has(id)) {
      this.pendingSubscriptions.delete(id);
      return;
    }
    const record = this.subscriptions.get(id);
    if (record) {
      record.subscription.unsubscribe();
      this.subscriptions.delete(id);
    }
  }

  send(destination: string, body: unknown, headers?: Record<string, string>): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination,
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
    });
  }

  setGlobalListeners(listeners: GlobalListeners): void {
    this.globalListeners = { ...this.globalListeners, ...listeners };
  }

  setOnReceive(handler: ((msg: unknown) => void) | null): void {
    this.onReceiveHandler = handler;
  }

  async disconnect(): Promise<void> {
    this.subscriptions.forEach((record) => {
      try {
        record.subscription.unsubscribe();
      } catch {
        /* ignore */
      }
    });
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
    if (this.client) {
      await this.client.deactivate();
      this.client = null;
    }
    this.setStatus("disconnected");
  }
}

const stompManager = new StompManager();
export default stompManager;
