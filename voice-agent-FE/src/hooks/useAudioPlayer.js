import { useRef, useCallback } from 'react';

const SAMPLE_RATE = 24000;

export function useAudioPlayer() {
  const contextRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);

  const init = useCallback(() => {
    contextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    nextStartTimeRef.current = 0;
    activeSourcesRef.current = [];
  }, []);

  const playChunk = useCallback((arrayBuffer) => {
    const context = contextRef.current;
    if (!context) return;

    const int16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = context.createBuffer(1, float32.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);

    const now = context.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  }, []);

  const stop = useCallback(() => {
    contextRef.current?.close();
    contextRef.current = null;
    nextStartTimeRef.current = 0;
    activeSourcesRef.current = [];
  }, []);

  /** Immediately stops all playing audio chunks (barge-in / interruption). */
  const interrupt = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  return { init, playChunk, stop, interrupt };
}
