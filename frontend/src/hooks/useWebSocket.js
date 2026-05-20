import { useEffect, useRef } from 'react';

/**
 * Custom hook for WebSocket connection to download progress.
 * @param {string} taskId - The download task UUID.
 * @param {function} onMessage - Callback for incoming messages.
 */
function useWebSocket(taskId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref up to date
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!taskId) return;

    /**
     * Connect to WebSocket server.
     */
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/ws/progress/${taskId}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Clear any reconnect timer
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);

          // If completed or failed, no need to keep connection
          if (data.status === 'completed' || data.status === 'failed') {
            ws.close();
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        // Attempt reconnect if not a clean close and task might still be active
        if (!event.wasClean) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [taskId]);
}

export default useWebSocket;
