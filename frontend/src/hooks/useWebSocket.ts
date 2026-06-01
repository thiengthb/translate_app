import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { RootState } from "@/store/store";
import { logger } from "@/lib/logger";

type MessageHandler = (payload: unknown) => void;

interface UseWebSocketOptions {
  onNotification?: MessageHandler;
  onEntityUpdate?: (entityName: string, entityId: number, action: string, data: unknown) => void;
  /** Entity topics to subscribe to, e.g. ["Book/1"] → /topic/entity/Book/1 */
  entityTopics?: string[];
  autoConnect?: boolean;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

// SockJS connects over HTTP(S), not the ws:// scheme — strip the /api suffix
// off the API base and let SockJS negotiate the transport (it upgrades to a
// native WebSocket when possible, falls back to XHR streaming otherwise).
const SOCKJS_URL = `${(import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true } = options;
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const clientRef = useRef<Client | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  // Keep the latest handlers/options without forcing a reconnect on every render.
  const handlersRef = useRef(options);
  handlersRef.current = options;

  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    setState((s) => ({ ...s, connecting: true, error: null }));

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKJS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Read the token fresh on every (re)connect so a token rotated by the
      // axios refresh flow is picked up without re-mounting the hook.
      beforeConnect: () => {
        const token = localStorage.getItem("token");
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        setState({ connected: true, connecting: false, error: null });

        const subs: StompSubscription[] = [];

        // User-targeted notifications (BE: convertAndSendToUser(userId, "/queue/notifications", ...))
        subs.push(
          client.subscribe("/user/queue/notifications", (msg: IMessage) => {
            handlersRef.current.onNotification?.(safeParse(msg.body));
          }),
        );

        // Optional entity-update topics (BE: /topic/entity/{name}/{id})
        for (const topic of handlersRef.current.entityTopics ?? []) {
          subs.push(
            client.subscribe(`/topic/entity/${topic}`, (msg: IMessage) => {
              const data = safeParse(msg.body) as
                | { entityName: string; entityId: number; action: string; data: unknown }
                | undefined;
              if (data) {
                handlersRef.current.onEntityUpdate?.(
                  data.entityName,
                  data.entityId,
                  data.action,
                  data.data,
                );
              }
            }),
          );
        }
      },
      onStompError: (frame) => {
        logger.error("STOMP error:", frame.headers["message"]);
        setState((s) => ({ ...s, error: frame.headers["message"] ?? "STOMP error" }));
      },
      onWebSocketClose: () => {
        setState({ connected: false, connecting: false, error: null });
      },
    });

    clientRef.current = client;
    client.activate();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.deactivate();
    clientRef.current = null;
    setState({ connected: false, connecting: false, error: null });
  }, []);

  const send = useCallback((destination: string, body: unknown) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({ destination, body: JSON.stringify(body) });
    }
  }, []);

  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    send,
  };
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}
