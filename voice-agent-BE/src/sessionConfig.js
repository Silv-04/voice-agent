const INSTRUCTIONS = 'Inti assistenti ta\' għajnuna li jitkellem bil-Malti. Wieġeb dejjem bil-Malti, b\'mod ċar u korteos.';

export function buildSessionConfig() {
  return {
    type: 'session.update',
    session: {
      instructions: INSTRUCTIONS,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'mt',
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      input_audio_echo_cancellation: { type: 'server_echo_cancellation' },
      input_audio_noise_reduction: { type: 'azure_deep_noise_suppression' },
    },
  };
}
