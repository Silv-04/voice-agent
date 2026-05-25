import { useRef, useCallback } from 'react';

export function useVoiceSocket({ onAudioChunk, onEvent }) {
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    const url = import.meta.env.VITE_BACKEND_WS_URL ?? 'wss://voice-agent-be-production.up.railway.app';
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => onEvent({ type: 'socket.connected' });

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        onAudioChunk(e.data);
        return;
      }
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        console.warn('Received unparseable message from backend');
      }
    };

    ws.onclose = () => onEvent({ type: 'socket.disconnected' });
    ws.onerror = () => onEvent({ type: 'error', message: 'WebSocket connection failed' });

    wsRef.current = ws;
  }, [onAudioChunk, onEvent]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendAudio = useCallback((buffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  const sendEvent = useCallback((event) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { connect, disconnect, sendAudio, sendEvent };
}
