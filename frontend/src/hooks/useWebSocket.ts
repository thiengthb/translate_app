import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

type MessageHandler = (payload: any) => void;

interface UseWebSocketOptions {
  onNotification?: MessageHandler;
  onEntityUpdate?: (entityName: string, entityId: number, action: string, data: any) => void;
  autoConnect?: boolean;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

const WS_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api")
  .replace("/api", "")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true } = options;
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  const handlersRef = useRef(options);
  handlersRef.current = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setState({ connected: true, connecting: false, error: null });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "notification" && handlersRef.current.onNotification) {
            handlersRef.current.onNotification(data.payload);
          }

          if (data.type === "entity-update" && handlersRef.current.onEntityUpdate) {
            handlersRef.current.onEntityUpdate(
              data.entityName,
              data.entityId,
              data.action,
              data.data,
            );
          }
        } catch {
          // non-JSON message, ignore
        }
      };

      ws.onclose = () => {
        setState({ connected: false, connecting: false, error: null });
        // Auto-reconnect after 5s
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        setState((s) => ({ ...s, error: "WebSocket connection failed" }));
      };
    } catch (err) {
      setState({ connected: false, connecting: false, error: "Failed to create WebSocket" });
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({ connected: false, connecting: false, error: null });
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
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
