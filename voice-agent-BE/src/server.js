import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createAzureProxy } from './azureProxy.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`Frontend connected from ${clientIp}`);

  const azureWs = createAzureProxy(ws);

  ws.on('close', () => {
    console.log(`Frontend disconnected from ${clientIp}`);
  });

  ws.on('error', (err) => {
    console.error(`Frontend WS error (${clientIp}):`, err.message);
    if (azureWs.readyState === WebSocket.OPEN) {
      azureWs.close();
    }
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
