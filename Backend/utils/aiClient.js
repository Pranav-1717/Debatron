const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');
const createLogger  = require('../utils/logger');
const logger = createLogger('AI Client ');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  .getGenerativeModel({ model: 'gemini-2.5-pro' });

function buildPrompt(byUser) {
  const lines = [
    'You are the sole judge of this debate.',
    'Rubric: Logic, Evidence, Rhetoric, Respect (0-10 each).',
    'Return JSON {userId->{logic,evidence,rhetoric,respect,total},winner}.',
  ];
  for (const [uid, arr] of Object.entries(byUser)) {
    lines.push(`=== userId:${uid} ===`);
    arr.forEach((s) => lines.push(`• ${s}`));
  }
  return lines.join('\n');
}

function scoreDebate(transcriptByUser) {
  const prompt = buildPrompt(transcriptByUser);
  return genAI.generateContent(prompt).then((res) => {
    return JSON.parse(res.response.candidates[0].content);
  });
}

// Deepgram streaming WebSocket (one per browser client)
function createDeepgramWS() {
  const url =
    'wss://api.deepgram.com/v1/listen?encoding=opus&sample_rate=48000&punctuate=true&model=nova';
  const ws = new WebSocket(url, {
    headers: { Authorization: `Token ${process.env.DEEPGRAM_KEY}` },
  });
  ws.on('open', () => logger.info('Deepgram WS open'));
  ws.on('error', (e) => logger.error('Deepgram WS error', e));
  return ws; // caller streams Opus blobs via ws.send(blob)
}

module.exports = {
  scoreDebate,
  createDeepgramWS,
  buildPrompt,
};
