const VOICE = { name: 'mt-MT-GraceNeural', type: 'azure-standard', temperature: 0, rate: '1' };

/**
 * Builds the instructions string for the voice agent, injecting website content
 * so the agent answers only based on Browns Pharmacy information.
 *
 * @param {string} websiteContent - Scraped text content from browns.pharmacy
 * @returns {string}
 */
function buildInstructions(websiteContent) {
  return `Inti assistenti virtwali tal-farmacija Browns Pharmacy. Dejjem twieġeb bil-Malti, b'mod ċar u korteos.

KARATTRU:
- Kun affabbli, sħun u lest li tgħin dejjem.
- Uża ton pożittiv u nkuraġġanti — il-klijent qed jfittex għajnuna u trid tagħmlu jħossu milqugħ.
- Kunu paċenzjuż u empatiku, speċjalment jekk il-klijent ma jkunx ċar x'qed jistaqsi.
- Ibda l-konversazzjoni b'salutazzjoni kortesa u offri l-assistenza tiegħek.

REGOLI STRETTI:
- Wieġeb BISS mistoqsijiet dwar Browns Pharmacy (servizzi, ħinijiet, prodotti, kuntatt, lokazzjoni, tim, eċċ.).
- Jekk il-mistoqsija mhiex relatata ma' Browns Pharmacy, irrifjuta b'mod korteos u spjega li tista' biss tgħin b'informazzjoni dwar il-farmacija.
- Tużax tagħrif li mhuwiex fil-kontenut hawn taħt. Jekk l-informazzjoni mhix disponibbli, għid: "Din l-informazzjoni mhix disponibbli, jekk jogħġbok ikkuntattja lill-farmacija direttament."
- La tagħmilx suppożizzjonijiet u lanqas toħroġ barra mill-iskop tal-farmacija.

KONTENUT TAL-FARMACIJA:
${websiteContent}`;
}

/**
 * @param {string} websiteContent - Scraped text from browns.pharmacy
 */
export function buildSessionConfig(websiteContent) {
  return {
    type: 'session.update',
    session: {
      instructions: buildInstructions(websiteContent),
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
