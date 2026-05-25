import { useRef, useCallback } from 'react';

export function useAudioCapture({ onChunk }) {
  const contextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const context = new AudioContext();
    await context.audioWorklet.addModule('/worklets/pcm-processor.js');

    const source = context.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(context, 'pcm-processor');

    worklet.port.onmessage = (e) => onChunk(e.data);

    source.connect(worklet);
    worklet.connect(context.destination);

    contextRef.current = context;
    workletNodeRef.current = worklet;
    streamRef.current = stream;
  }, [onChunk]);

  const stop = useCallback(() => {
    workletNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    contextRef.current?.close();

    workletNodeRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
  }, []);

  const mute = useCallback((muted) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, []);

  return { start, stop, mute };
}
