import WebSocket from 'ws';
import { buildSessionConfig } from './sessionConfig.js';

/**
 * Opens a WebSocket connection to the Azure Voice Live API and wires it
 * bidirectionally to the given frontend WebSocket.
 *
 * On open, sends the initial session config.
 * Incoming audio deltas from Azure are decoded from base64 and forwarded as
 * binary frames; all other events are forwarded as JSON.
 * Incoming binary frames from the frontend are wrapped in an
 * `input_audio_buffer.append` event before being sent to Azure.
 *
 * @param {import('ws').WebSocket} frontendWs - The WebSocket connection from the browser client.
 * @returns {import('ws').WebSocket} The Azure WebSocket connection.
 */
export function createAzureProxy(frontendWs) {
  const endpoint = process.env.AZURE_VOICELIVE_ENDPOINT;
  const apiKey = process.env.AZURE_VOICELIVE_API_KEY;
  const model = process.env.AZURE_VOICELIVE_MODEL;

  const wssBase = endpoint
    .replace(/^https:\/\//, 'wss://')
    .replace(/\/?$/, '/voice-live/realtime');
  const azureUrl = `${wssBase}?api-version=2025-10-01&model=${model}`;

  console.log('Connecting to Azure:', azureUrl);

  const azureWs = new WebSocket(azureUrl, {
    headers: { 'api-key': apiKey },
  });

  /** Sends the session configuration to Azure as soon as the connection is established. */
  azureWs.on('open', () => {
    console.log('Connected to Azure Voice Live API');
    azureWs.send(JSON.stringify(buildSessionConfig()));
  });

  /**
   * Forwards messages from Azure to the frontend.
   * Binary frames are passed through as-is. JSON events of type
   * `response.audio.delta` have their base64 payload decoded to a binary
   * buffer before forwarding; all other JSON events are forwarded unchanged.
   */
  azureWs.on('message', (data, isBinary) => {
    if (frontendWs.readyState !== WebSocket.OPEN) return;

    if (isBinary) {
      frontendWs.send(data, { binary: true });
      return;
    }

    let event;
    try {
      event = JSON.parse(data.toString());
    } catch {
      frontendWs.send(data);
      return;
    }

    if (event.type === 'response.audio.delta' && event.delta) {
      const audioBuffer = Buffer.from(event.delta, 'base64');
      frontendWs.send(audioBuffer, { binary: true });
      return;
    }

    frontendWs.send(JSON.stringify(event));
  });

  /** Closes the frontend connection when Azure closes its side. */
  azureWs.on('close', (code, reason) => {
    console.log(`Azure WS closed: ${code}`);
    if (frontendWs.readyState === WebSocket.OPEN) {
      frontendWs.close(1000, reason);
    }
  });

  /** Logs the HTTP status and body when Azure rejects the WebSocket upgrade. */
  azureWs.on('unexpected-response', (_req, res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.error(`Azure rejected WebSocket upgrade: HTTP ${res.statusCode}`);
      console.error('Response body:', body);
    });
  });

  /** Forwards the error message to the frontend as a JSON event, then closes both connections. */
  azureWs.on('error', (err) => {
    console.error('Azure WS error:', err.message);
    if (frontendWs.readyState === WebSocket.OPEN) {
      frontendWs.send(JSON.stringify({ type: 'error', message: err.message }));
      frontendWs.close();
    }
  });

  /**
   * Forwards messages from the frontend to Azure.
   * Binary frames (raw audio) are wrapped in an `input_audio_buffer.append`
   * JSON event with the audio encoded as base64; text frames are sent as-is.
   */
  frontendWs.on('message', (data, isBinary) => {
    if (azureWs.readyState !== WebSocket.OPEN) return;

    if (isBinary) {
      azureWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: data.toString('base64'),
      }));
      return;
    }

    azureWs.send(data);
  });

  /** Closes the Azure connection when the frontend disconnects. */
  frontendWs.on('close', () => {
    if (azureWs.readyState === WebSocket.OPEN) {
      azureWs.close();
    }
  });

  return azureWs;
}
