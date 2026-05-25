# Maltese Voice Agent

Real-time voice agent in Maltese (mt-MT) using Azure Voice Live API, Node.js, and React.

## Architecture

```
Browser mic (PCM16 16kHz)
  → WebSocket → voice-agent-backend
    → WebSocket (wss://) → Azure Voice Live API
      ← audio chunks ←
  ← WebSocket ← voice-agent-backend
← Browser speakers
```

The API key never leaves the backend.

---

## Prerequisites

- Node.js 18+
- An Azure AI Foundry resource with Voice Live API access (see below)


---

## Backend setup

```bash
cd voice-agent-backend
npm install
```

Edit `.env` and fill in your credentials:

```
AZURE_VOICELIVE_ENDPOINT=wss://<your-resource>.services.ai.azure.com/voice-live/realtime
AZURE_VOICELIVE_API_KEY=your_api_key_here
AZURE_VOICELIVE_MODEL=gpt-4.1-mini
PORT=8080
```

Start the backend:

```bash
npm run dev     # development (auto-restart)
npm start       # production
```

---

## Frontend setup

```bash
cd voice-agent-frontend
npm install
```

`.env` is pre-configured for local development:

```
VITE_BACKEND_WS_URL=ws://localhost:8080
```

Start the frontend:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Usage

1. Start the backend first, then the frontend.
2. Click **Ibda** (Start) and allow microphone access.
3. Speak in Maltese — the agent will respond in Maltese.
4. Click **Ieqaf** (Stop) to end the session.

The transcript panel shows both sides of the conversation in real time.

---

## Project structure

```
voice-agent-backend/
  src/
    server.js         Express + WebSocket server
    azureProxy.js     Proxy logic between frontend and Azure
    sessionConfig.js  Azure session configuration (language, VAD, prompt)
  .env
  .env.example

voice-agent-frontend/
  public/
    worklets/
      pcm-processor.js  AudioWorklet for PCM16 capture at 16kHz
  src/
    hooks/
      useVoiceSocket.js   WebSocket connection to backend
      useAudioCapture.js  Microphone capture
      useAudioPlayer.js   Real-time audio playback
    App.jsx
    App.css
    main.jsx
  .env
  .env.example
```
