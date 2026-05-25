import { useRef, useCallback } from 'react';

const SAMPLE_RATE = 24000;

export function useAudioPlayer() {
  const contextRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  const init = useCallback(() => {
    contextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    nextStartTimeRef.current = 0;
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
  }, []);

  const stop = useCallback(() => {
    contextRef.current?.close();
    contextRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const flush = useCallback(() => {
    nextStartTimeRef.current = 0;
  }, []);

  return { init, playChunk, stop, flush };
}
