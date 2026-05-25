import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceSocket } from './hooks/useVoiceSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import './App.css';

const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

const STATUS_LABEL = {
  [STATUS.IDLE]: 'Lest',
  [STATUS.CONNECTING]: 'Qed jgħaqqad...',
  [STATUS.LISTENING]: 'Qed jisma\'...',
  [STATUS.SPEAKING]: 'Qed jitkellem...',
  [STATUS.ERROR]: 'Żball',
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState([]);
  const [backendReachable, setBackendReachable] = useState(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL ?? 'wss://voice-agent-be-production.up.railway.app';
    const httpUrl = wsUrl.replace(/^ws(s?):\/\//, 'http$1://');
    fetch(`${httpUrl}/health`)
      .then((r) => r.ok ? setBackendReachable(true) : setBackendReachable(false))
      .catch(() => setBackendReachable(false));
  }, []);

  const addTranscriptEntry = useCallback((role, text) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.partial) {
        return [...prev.slice(0, -1), { role, text, partial: false }];
      }
      return [...prev, { role, text, partial: false }];
    });
  }, []);

  const updatePartialTranscript = useCallback((role, delta) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.partial) {
        return [...prev.slice(0, -1), { role, text: last.text + delta, partial: true }];
      }
      return [...prev, { role, text: delta, partial: true }];
    });
  }, []);

  const { init: initPlayer, playChunk, stop: stopPlayer, flush: flushPlayer } = useAudioPlayer();

  const handleAudioChunk = useCallback((buffer) => {
    playChunk(buffer);
  }, [playChunk]);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'socket.connected':
        setStatus(STATUS.LISTENING);
        break;

      case 'socket.disconnected':
        if (isActiveRef.current) setStatus(STATUS.IDLE);
        break;

      case 'error':
        setStatus(STATUS.ERROR);
        console.error('Agent error:', event.message);
        break;

      case 'input_audio_buffer.speech_started':
        setStatus(STATUS.LISTENING);
        flushPlayer();
        break;

      case 'response.audio_transcript.delta':
        updatePartialTranscript('agent', event.delta ?? '');
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          addTranscriptEntry('agent', event.transcript);
        }
        break;

      case 'response.audio.done':
        setStatus(STATUS.LISTENING);
        break;

      case 'response.created':
        setStatus(STATUS.SPEAKING);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          addTranscriptEntry('user', event.transcript);
        }
        break;
    }
  }, [addTranscriptEntry, updatePartialTranscript, flushPlayer]);

  const { connect, disconnect, sendAudio } = useVoiceSocket({
    onAudioChunk: handleAudioChunk,
    onEvent: handleEvent,
  });

  const { start: startCapture, stop: stopCapture, mute } = useAudioCapture({
    onChunk: sendAudio,
  });

  const handleStart = useCallback(async () => {
    setStatus(STATUS.CONNECTING);
    setTranscript([]);
    isActiveRef.current = true;

    try {
      initPlayer();
      connect();
      await startCapture();
    } catch (err) {
      console.error('Failed to start:', err);
      setStatus(STATUS.ERROR);
    }
  }, [connect, startCapture, initPlayer]);

  const handleStop = useCallback(() => {
    isActiveRef.current = false;
    stopCapture();
    disconnect();
    stopPlayer();
    setStatus(STATUS.IDLE);
  }, [stopCapture, disconnect, stopPlayer]);

  const isActive = status !== STATUS.IDLE && status !== STATUS.ERROR;

  return (
    <div className="app">
      <header className="header">
        <h1>Aġent tal-Vuċi Malti</h1>
        <p className="subtitle">Maltese Voice Agent</p>
        <div className={`backend-status backend-status--${backendReachable === null ? 'checking' : backendReachable ? 'ok' : 'error'}`}>
          <span className="backend-status__dot" />
          <span className="backend-status__label">
            {backendReachable === null ? 'Checking backend...' : backendReachable ? 'Backend connected' : 'Backend unreachable'}
          </span>
        </div>
      </header>

      <div className="controls">
        <button
          className={`main-button ${isActive ? 'active' : ''}`}
          onClick={isActive ? handleStop : handleStart}
          disabled={status === STATUS.CONNECTING}
        >
          {isActive ? 'Ieqaf' : 'Ibda'}
        </button>

        <div className={`status-indicator status-${status}`}>
          <span className="status-dot" />
          <span className="status-label">{STATUS_LABEL[status]}</span>
        </div>
      </div>

      <div className="transcript">
        {transcript.length === 0 && (
          <p className="transcript-empty">
            {isActive ? 'Qed nisimgħek...' : 'Agħfas "Ibda" biex tibda...'}
          </p>
        )}
        {transcript.map((entry, i) => (
          <div key={i} className={`transcript-entry ${entry.role}`}>
            <span className="transcript-role">
              {entry.role === 'user' ? 'Int' : 'Aġent'}
            </span>
            <span className={`transcript-text ${entry.partial ? 'partial' : ''}`}>
              {entry.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
