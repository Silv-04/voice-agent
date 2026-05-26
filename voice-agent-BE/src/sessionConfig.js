const INSTRUCTIONS = 'Inti assistenti ta\' għajnuna li jitkellem bil-Malti. Wieġeb dejjem bil-Malti, b\'mod ċar u korteos.';
const VOICE = { name: 'mt-MT-GraceNeural', type: 'azure-standard', temperature: 0, rate: '1' };

export function buildSessionConfig() {
  return {
    type: 'session.update',
    session: {
      instructions: INSTRUCTIONS,
      voice: VOICE,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'azure-speech',
        language: 'mt-mt',
      },
      turn_detection: {
        type: 'azure_semantic_vad',
        threshold: 0.5,
        prefix_padding_ms: 420,
        silence_duration_ms: 500,
      },
      input_audio_echo_cancellation: { type: 'server_echo_cancellation' },
      input_audio_noise_reduction: { type: 'azure_deep_noise_suppression' },
    },
  };
}
