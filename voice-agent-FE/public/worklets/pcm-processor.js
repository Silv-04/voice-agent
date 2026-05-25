class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._resampleRatio = sampleRate / 24000;
    this._chunkSize = 4096;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += this._resampleRatio) {
      const sample = channel[Math.floor(i)];
      const clamped = Math.max(-1, Math.min(1, sample));
      this._buffer.push(Math.floor(clamped * 32767));
    }

    while (this._buffer.length >= this._chunkSize) {
      const chunk = new Int16Array(this._buffer.splice(0, this._chunkSize));
      this.port.postMessage(chunk.buffer, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
