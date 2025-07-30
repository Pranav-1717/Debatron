// E:\Debatron\Backend\socket.js
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { scoreDebate, createDeepgramWS } = require('./utils/aiClient');
const Message = require('./models/Message');
const DebateRoom = require('./models/Debate');
const createLogger = require('./utils/logger');
const mongoose = require('mongoose');

const logger = createLogger('SocketServer');

const CAPTURE_MS = 15 * 1000; // 15 seconds (mic active, saves transcript)

let io; // Global Socket.IO server instance
let roomServiceLeaveRoomCallback = null; // This will hold the leaveRoom callback from roomService, injected by server.js


/**
 * Helper to update the currentRoomPhase on all sockets in a specific room.
 * Exported by `startSocketServer` return object.
 */
const updateSocketsPhaseInRoom = (roomId, phase) => {
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
        roomSockets.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.data.currentRoomPhase = phase;
                logger.debug(`Socket ${socket.id} in room ${roomId} updated to phase: ${phase}`);
            }
        });
    } else {
        logger.warn(`No sockets found in room ${roomId} to update phase to ${phase}.`);
    }
};

/**
 * Sets the callbacks from roomService into socket.js.
 * This function's name matches what server.js imports.
 * IMPORTANT: This function definition is placed above module.exports.
 */
function setRoomServiceCallbacks(callback) {
    roomServiceLeaveRoomCallback = callback.leaveRoom; // It expects an object with a 'leaveRoom' property
    logger.info("roomService callbacks injected into socket.js (specifically leaveRoom).");
}

/**
 * Processes and saves a transcribed message (only during 'debate-start' phase).
 * IMPORTANT: This function definition is placed above module.exports.
 */
async function processAndSaveMessage(roomId, userId, text) {
    io.to(roomId).emit('new-text', { userId, text });

    try {
        const msg = await Message.create({
            debateId: roomId,
            sender: userId,
            sentences: [{ text }],
        });
        await DebateRoom.findByIdAndUpdate(roomId, { $push: { messages: msg._id } });
        logger.debug(`Message saved from user ${userId} in room ${roomId}: "${text.substring(0, Math.min(text.length, 50))}..."`);
    } catch (error) {
        logger.error(`Error saving message for room ${roomId}, user ${userId}: ${error.message}`, error);
    }
}

/**
 * Initializes a Deepgram WebSocket connection for a user's socket.
 * IMPORTANT: This function definition is placed above module.exports.
 */
async function initializeDeepgramForSocket(socket) {
    if (socket.data.deepgramWS && socket.data.deepgramWS.readyState === WebSocket.OPEN) {
        logger.warn(`Deepgram WS already open for user ${socket.data.userId}. Skipping re-initialization.`);
        return;
    }

    const deepgramWS = createDeepgramWS();
    socket.data.deepgramWS = deepgramWS;

    deepgramWS.on('open', () => {
        logger.info(`Deepgram WS opened for user ${socket.data.userId}.`);
    });

    deepgramWS.on('message', async (data) => {
        try {
            const json = JSON.parse(data.toString());
            const transcript = json.channel?.alternatives?.[0]?.transcript;
            const isFinal = json.is_final;

            if (transcript?.trim() && isFinal) {
                const currentRoomPhase = socket.data.currentRoomPhase;
                if (currentRoomPhase === 'debate-start') {
                    await processAndSaveMessage(socket.data.roomId, socket.data.userId, transcript);
                } else {
                    logger.debug(`Deepgram transcript received outside 'debate-start' phase (current: ${currentRoomPhase}). Broadcasting only.`);
                    io.to(socket.data.roomId).emit('new-text', { userId: socket.data.userId, text: transcript });
                }
            }
        } catch (err) {
            logger.error(`Error parsing Deepgram message for user ${socket.data.userId}: ${err.message}`, err);
        }
    });

    deepgramWS.on('close', (code, reason) => {
        logger.info(`Deepgram WS closed for ${socket.data.userId}. Code: ${code}, Reason: ${reason}`);
    });

    deepgramWS.on('error', (err) => {
        logger.error(`Deepgram WebSocket error for user ${socket.data.userId}: ${err.message}`, err);
        if (socket.data.deepgramWS?.readyState === WebSocket.OPEN) {
            socket.data.deepgramWS.close();
        }
    });
}

/**
 * Handles a client joining a debate room.
 * IMPORTANT: This function definition is placed above module.exports.
 */
async function handleJoinRoom(socket, roomId) {
    socket.join(roomId);
    socket.data.roomId = roomId;
    logger.info(`User ${socket.data.userId} joined Socket.IO room ${roomId}.`);

    let room = null;
    let currentRoomPhase = 'connecting';

    if (mongoose.Types.ObjectId.isValid(roomId)) {
        try {
            room = await DebateRoom.findById(roomId, 'status startedAt participants');
            if (room) {
                logger.info(`[handleJoinRoom] Room ID ${roomId} is a valid ObjectId and room was found in DB.`);
                currentRoomPhase = room.status;
            } else {
                logger.warn(`[handleJoinRoom] Room ID ${roomId} is a valid ObjectId but no room found.`);
                currentRoomPhase = 'error';
            }
        } catch (error) {
            logger.error(`[handleJoinRoom] Error finding room ${roomId} in DB: ${error.message}`, error);
            currentRoomPhase = 'error';
        }
    } else {
        logger.error(`[handleJoinRoom] Room ID ${roomId} is NOT a valid ObjectId format. This should not happen in baseline.`);
        currentRoomPhase = 'error';
    }

    socket.data.isRankedRoom = true; // Simplified: always true for baseline
    socket.data.currentRoomPhase = currentRoomPhase;

    if (room) {
        if (room.startedAt) {
            const elapsed = Date.now() - room.startedAt;
            io.to(socket.id).emit('timer-sync', { elapsed });

            if (elapsed < CAPTURE_MS) {
                io.to(socket.id).emit('phase', 'debate-start');
                updateSocketsPhaseInRoom(roomId, 'debate-start');
                await initializeDeepgramForSocket(socket);
            } else {
                io.to(socket.id).emit('phase', 'finished');
                updateSocketsPhaseInRoom(roomId, 'finished');
            }
        } else if (room.status === 'pending') {
            io.to(socket.id).emit('phase', 'pending');
            io.to(roomId).emit('participant-update', { participants: room.participants.length });
            updateSocketsPhaseInRoom(roomId, 'pending');
        } else {
            io.to(socket.id).emit('phase', room.status);
            updateSocketsPhaseInRoom(roomId, room.status);
        }
    } else {
        io.to(socket.id).emit('phase', 'error');
        updateSocketsPhaseInRoom(roomId, 'error');
    }
}

/**
 * Finalizes a debate room: fetches messages, calculates scores using AI, and updates the DB.
 * IMPORTANT: This function definition is placed above module.exports.
 */
async function finalizeDebate(roomId) {
    const room = await DebateRoom.findById(roomId);

    if (!room || room.status !== 'ongoing') {
        logger.warn(`[finalizeDebate] Room ${roomId} not found or not ongoing (${room?.status}). Skipping finalize.`);
        io.to(roomId).emit('phase', 'finished');
        updateSocketsPhaseInRoom(roomId, 'finished');
        return;
    }

    logger.info(`[finalizeDebate] Finalizing room ${roomId}: Fetching messages for scoring.`);
    const msgs = await Message.find({ debateId: roomId }).select('sender sentences').lean();
    const transcriptByUser = {};
    msgs.forEach((m) => {
        (transcriptByUser[m.sender.toString()] ||= []).push(...m.sentences.map((s) => s.text));
    });

    let scoresResult;
    try {
        logger.info(`[finalizeDebate] Sending transcript for room ${roomId} to AI for scoring.`);
        scoresResult = await scoreDebate(transcriptByUser);
        logger.info(`[finalizeDebate] AI scored debate ${roomId}: ${JSON.stringify(scoresResult)}`);
    } catch (error) {
        logger.error(`[finalizeDebate] Error scoring debate ${roomId} with AI: ${error.message}`, error);
        scoresResult = { winner: null, error: 'AI scoring failed.' };
    }


    io.to(roomId).emit('final-score', scoresResult);
    io.to(roomId).emit('phase', 'finished'); // Directly to finished phase
    logger.info(`[finalizeDebate] Room ${roomId} finished.`);
    updateSocketsPhaseInRoom(roomId, 'finished');

    await DebateRoom.findByIdAndUpdate(roomId, {
        status: 'finished',
        scores: scoresResult,
        winner: scoresResult.winner,
    }, { new: true });
}

/**
 * Starts the timed phases for a debate.
 * IMPORTANT: This function definition is placed above module.exports.
 */
function startDebateTimers(roomId) {
    logger.info(`[startDebateTimers] Setting up timers for room ${roomId}: CAPTURE_MS: ${CAPTURE_MS}`);
    
    setTimeout(async () => {
        const room = await DebateRoom.findById(roomId);
        if (!room || room.status !== 'ongoing') {
            logger.warn(`[startDebateTimers] Room ${roomId} not in 'ongoing' state after initial wait. Current status: ${room?.status}. Skipping debate start.`);
            return;
        }

        io.to(roomId).emit('phase', 'debate-start'); // Notify clients to start debating and saving
        logger.info(`[startDebateTimers] Room ${roomId}: Capture window OPEN.`);
        updateSocketsPhaseInRoom(roomId, 'debate-start');

        setTimeout(() => finalizeDebate(roomId), CAPTURE_MS);

    }, 0); // WAIT_SECONDS is handled in roomService.autoStartDebate
}

/**
 * Entry point to start the Socket.IO server and set up all event listeners.
 * IMPORTANT: This function definition is placed above module.exports.
 */
function startSocketServer(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
    });

    io.use((socket, next) => {
        const { userId } = socket.handshake.query;
        if (!userId) { return next(new Error('Authentication required: userId missing.')); }
        if (!mongoose.Types.ObjectId.isValid(userId)) { return next(new Error('Invalid userId format.')); }
        socket.data.userId = userId;
        logger.info(`Socket authenticated: ${socket.id} (User: ${userId})`);
        next();
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

        socket.on('join-room', async ({ roomId }) => {
            try {
                if (!roomId) { return socket.emit('room-error', { message: 'Room ID is required.' }); }
                await handleJoinRoom(socket, roomId);
            } catch (err) {
                logger.error(`User ${socket.data.userId} join-room ${roomId} failed: ${err.message}`, err);
                socket.emit('room-error', { message: 'Failed to join room', error: err.message });
            }
        });

        socket.on('audio-stream', ({ audio }) => {
            if (socket.data.deepgramWS && socket.data.deepgramWS.readyState === WebSocket.OPEN) {
                socket.data.deepgramWS.send(audio);
            } else {
                logger.warn(`Deepgram WS not ready for user ${socket.data.userId} in room ${socket.data.roomId}. Audio ignored.`);
            }
        });

        socket.on('transcript', async ({ text }) => {
            const { roomId, userId } = socket.data;
            if (!roomId || !text?.trim()) return;

            const currentRoomPhase = socket.data.currentRoomPhase;
            if (currentRoomPhase === 'debate-start') {
                await processAndSaveMessage(roomId, userId, text);
            } else {
                logger.debug(`Transcript received outside 'debate-start' phase (current: ${currentRoomPhase}). Broadcasting only.`);
                io.to(roomId).emit('new-text', { userId, text });
            }
        });

        socket.on('leave-room', async ({ roomId, userId }) => {
            if (!roomServiceLeaveRoomCallback) {
                logger.error("roomService.leaveRoom callback not set! Cannot process leave-room event.");
                return;
            }
            await roomServiceLeaveRoomCallback({ roomId, userId });
            socket.leave(roomId);
            logger.info(`User ${userId} left Socket.IO room ${roomId} via 'leave-room' event.`);
        });

        socket.on('disconnect', (reason) => {
            if (socket.data.deepgramWS && socket.data.deepgramWS.readyState === WebSocket.OPEN) {
                socket.data.deepgramWS.close();
                logger.info(`Deepgram WS closed for ${socket.data.userId} due to socket disconnect. Reason: ${reason}`);
            }
            logger.info(`Socket disconnected: ${socket.id} (User: ${socket.data.userId}). Reason: ${reason}`);
        });
    });

    logger.info('Socket server initialized 🚀');

    // Return an object that includes the io instance and any methods roomService needs to call
    return {
        io: io,
        startDebateTimers: startDebateTimers,
        updateSocketsPhaseInRoom: updateSocketsPhaseInRoom,
        setRoomServiceCallbacks: setRoomServiceCallbacks // Export the setter function
    };
}

console.log("DEBUG_EXPORT: Type of startSocketServer (just before module.exports):", typeof startSocketServer);
console.log("DEBUG_EXPORT: Type of setRoomServiceCallbacks (just before module.exports):", typeof setRoomServiceCallbacks);

module.exports = {
    startSocketServer,
    setRoomServiceCallbacks: setRoomServiceCallbacks,
};