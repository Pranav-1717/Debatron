import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import logger from './config/logger.js';
import { scoreDebate } from './utils/aiClient.js';
import Message from './models/Message.js';
import DebateRoom from './models/DebateRoom.js';

const INTRO_MS    = 2 * 60_000;  // first 2 min: no scoring
const CAPTURE_MS  = 10 * 60_000; // next 10 min: record STT
const COOLDOWN_MS = 60_000;      // final 1 min: show scoreboard

/* ------------------------------------------------------------------ */
/*  HTTP + WebSocket bootstrap                                        */
/* ------------------------------------------------------------------ */
const httpServer = http.createServer(app);
export const io  = new Server(httpServer, { cors: { origin: '*' } });

/* ------------------------------------------------------------------ */
/*  Middleware – simple tokenless auth using ?userId query            */
/* ------------------------------------------------------------------ */
io.use((socket, next) => {
  const { userId } = socket.handshake.query;
  if (!userId) return next(new Error('Unauthenticated'));
  socket.data.userId = userId;
  next();
});

/* ------------------------------------------------------------------ */
/*  Socket events                                                     */
/* ------------------------------------------------------------------ */
io.on('connection', (socket) => {

  /* ── join-room ─────────────────────────────────────────────────── */
  socket.on('join-room', async ({ roomId }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    logger.info(`${socket.data.userId} joined ${roomId}`);

    // Late joiner needs elapsed time
    const room = await DebateRoom.findById(roomId, 'status startedAt');
    if (room?.startedAt) {
      const elapsed = Date.now() - room.startedAt;
      io.to(socket.id).emit('timer-sync', { elapsed });
    }
  });

  /* ── transcript ── Accept only in 10‑min capture window ────────── */
  socket.on('transcript', async ({ text }) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !text?.trim()) return;

    const room = await DebateRoom.findById(roomId, 'status startedAt');
    if (room.status !== 'ongoing' || !room.startedAt) return;

    const elapsed = Date.now() - room.startedAt;
    if (elapsed < INTRO_MS || elapsed > INTRO_MS + CAPTURE_MS) return; // ignore

    io.to(roomId).emit('new-text', { userId, text });

    const msg = await Message.create({
      debateId: roomId,
      sender:   userId,
      sentences:[{ text }],
    });
    await DebateRoom.findByIdAndUpdate(roomId, { $push: { messages: msg._id } });
  });
});

/* ------------------------------------------------------------------ */
/*  Called by roomService right after first user joins pending room   */
/* ------------------------------------------------------------------ */
export function startDebateTimers(roomId) {

  // 1. Intro → after 2 min open scoring window
  setTimeout(async () => {
    const room = await DebateRoom.findById(roomId);
    if (!room || room.status !== 'ongoing') return;

    io.to(roomId).emit('phase', 'debate-start');
    logger.info(`Room ${roomId}: capture window OPEN`);

    // 2. End capture after 10 min
    setTimeout(() => finalizeDebate(roomId), CAPTURE_MS);

  }, INTRO_MS);
}

/* ------------------------------------------------------------------ */
/*  Aggregate, score, 1‑min cooldown, mark finished                   */
/* ------------------------------------------------------------------ */
async function finalizeDebate(roomId) {
  const room = await DebateRoom.findById(roomId);
  if (!room || room.status !== 'ongoing') return;

  const msgs = await Message.find({ debateId: roomId });
  const transcriptByUser = {};
  msgs.forEach(m => {
    (transcriptByUser[m.sender] ||= []).push(...m.sentences.map(s => s.text));
  });

  const scores = await scoreDebate(transcriptByUser);
  io.to(roomId).emit('final-score', scores);
  io.to(roomId).emit('phase', 'cooldown');

  // 3. One‑minute scoreboard
  setTimeout(async () => {
    await DebateRoom.findByIdAndUpdate(roomId, {
      status:  'finished',
      scores,
      winner:  scores.winner,
    });
    io.to(roomId).emit('phase', 'finished');
    logger.info(`Room ${roomId} finished`);
  }, COOLDOWN_MS);
}

/* ------------------------------------------------------------------ */
/*  Exported boot helper                                              */
/* ------------------------------------------------------------------ */
export function startSocketServer(port = env.PORT) {
  httpServer.listen(port, () => logger.info(`Socket server running on :${port}`));
}
