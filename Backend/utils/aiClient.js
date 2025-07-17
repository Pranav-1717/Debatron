
import { GoogleGenerativeAI } from '@google/generative-ai';
import WebSocket from 'ws';
import logger from '../config/logger.js';

// Gemini 2.5 Pro client
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  .getGenerativeModel({ model: 'gemini-2.5-pro' });

export async function scoreDebate(transcriptByUser) {
  const prompt = buildPrompt(transcriptByUser);
  const res = await genAI.generateContent(prompt);
  return JSON.parse(res.response.candidates[0].content);
}

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

// Deepgram streaming WebSocket (one per browser client)
export function createDeepgramWS() {
  const url =
    'wss://api.deepgram.com/v1/listen?encoding=opus&sample_rate=48000&punctuate=true&model=nova';
  const ws = new WebSocket(url, {
    headers: { Authorization: `Token ${process.env.DEEPGRAM_KEY}` },
  });
  ws.on('open', () => logger.info('Deepgram WS open'));
  ws.on('error', (e) => logger.error('Deepgram WS error', e));
  return ws; // caller streams Opus blobs via ws.send(blob)
}
