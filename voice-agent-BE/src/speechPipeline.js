import sdk from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';

const SYSTEM_PROMPT = 'Inti assistenti ta\' għajnuna li jitkellem bil-Malti. Wieġeb dejjem bil-Malti, b\'mod ċar u korteos.';

/**
 * Creates a speech pipeline (STT → LLM → TTS) connected to the given frontend WebSocket.
 * Streams incoming PCM audio through Azure Speech STT, sends the transcript to Azure OpenAI,
 * then synthesizes the response with mt-MT-GraceNeural and sends the audio back to the frontend.
 *
 * @param {import('ws').WebSocket} frontendWs
 */
export function createSpeechPipeline(frontendWs) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );
  speechConfig.speechRecognitionLanguage = 'mt-MT';
  speechConfig.speechSynthesisVoiceName = 'mt-MT-GraceNeural';
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm;

  const openai = new OpenAI({
    baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  });

  const conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];

  const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(24000, 16, 1);
  const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognized = async (_s, e) => {
    if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
    const transcript = e.result.text;
    if (!transcript) return;

    frontendWs.send(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript,
    }));

    conversationHistory.push({ role: 'user', content: transcript });

    let responseText;
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_MODEL,
        messages: conversationHistory,
      });
      responseText = completion.choices[0].message.content;
    } catch (err) {
      console.error('LLM error:', err.message);
      frontendWs.send(JSON.stringify({ type: 'error', message: 'LLM request failed' }));
      return;
    }

    conversationHistory.push({ role: 'assistant', content: responseText });

    frontendWs.send(JSON.stringify({ type: 'response.audio_transcript.done', transcript: responseText }));
    frontendWs.send(JSON.stringify({ type: 'response.created' }));

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
    synthesizer.speakTextAsync(
      responseText,
      result => {
        if (result.audioData && frontendWs.readyState === 1) {
          frontendWs.send(result.audioData, { binary: true });
        }
        frontendWs.send(JSON.stringify({ type: 'response.audio.done' }));
        synthesizer.close();
      },
      err => {
        console.error('TTS error:', err);
        frontendWs.send(JSON.stringify({ type: 'error', message: 'TTS request failed' }));
        synthesizer.close();
      }
    );
  };

  recognizer.canceled = (_s, e) => {
    console.error('STT canceled:', e.errorDetails);
  };

  recognizer.startContinuousRecognitionAsync();

  frontendWs.on('message', (data, isBinary) => {
    if (isBinary) pushStream.write(data);
  });

  frontendWs.on('close', () => {
    recognizer.stopContinuousRecognitionAsync(() => {
      pushStream.close();
      recognizer.close();
    });
  });
}
