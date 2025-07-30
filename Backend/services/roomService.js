const DebateRoom = require('../models/Debate');
const Participation = require('../models/Participation');
const Topic = require('../models/Topic');
const User = require('../models/User');
const createLogger = require('../utils/logger');

let injectedSocketIoHelpers = null;

const logger = createLogger('RoomService');

const MAX_ROOM_SIZE = 6;
const MIN_PARTICIPANTS_TO_START = 2;
const WAIT_SECONDS = 5; // टेस्टिंग के लिए छोटा कर दिया गया है


function setSocketCallbacks(callbacks) {
    injectedSocketIoHelpers = callbacks;
    logger.info("Socket.IO callbacks injected into roomService.js.");
}

const joinDebate = async ({ userId, topicId }) => {
    logger.info(`[joinDebate] Called with userId: ${userId}, topicId: ${topicId}.`);

    const topic = await Topic.findById(topicId);
    if (!topic) {
        logger.warn(`[joinDebate] Topic not found for ID: ${topicId}`);
        throw new Error('Topic not found');
    }
    logger.info(`[joinDebate] Topic "${topic.title}" found.`);

    let room = await DebateRoom.findOne({
        topicId: topicId,
        status: 'pending',
        participants: { $ne: userId }
    }).sort({ createdAt: 1 });

    if (room) {
        logger.info(`[joinDebate] Found existing pending room: ${room._id}. Participants: ${room.participants.length}/${MAX_ROOM_SIZE}`);
    } else {
        logger.info(`[joinDebate] No suitable pending room found for topic ${topicId}.`);
    }

    if (!room || room.participants.length >= MAX_ROOM_SIZE) {
        logger.info(`[joinDebate] Creating a NEW DebateRoom for topic ${topicId}.`);
        room = await DebateRoom.create({
            topicId: topicId,
            participants: [],
            isPremiumRoom: topic.isPremium,
            status: 'pending'
        });
        logger.info(`[joinDebate] NEW DebateRoom created with ID: ${room._id}`);
    }

    if (!room || !room._id) {
        logger.error(`[joinDebate] FATAL ERROR: DebateRoom object or its _id is undefined AFTER findOne/create. Room state: ${JSON.stringify(room)}`);
        throw new Error("Internal server error: Failed to find or create debate room.");
    }

    if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        await room.save();
        logger.info(`[joinDebate] User ${userId} ADDED to DebateRoom ${room._id}. Current participants: ${room.participants.length}`);
        if (injectedSocketIoHelpers?.io) {
            injectedSocketIoHelpers.io.to(room._id.toString()).emit('participant-update', { participants: room.participants.length });
        }
    } else {
        logger.info(`[joinDebate] User ${userId} is ALREADY IN DebateRoom ${room._id}. Skipping add.`);
    }

    try {
        logger.info(`[joinDebate] Attempting to create Participation record for userId: ${userId}, topicId: ${topicId}, roomId: ${room._id}`);
        await Participation.create({ userId, topicId, roomId: room._id });
        logger.info(`[joinDebate] Participation record created successfully.`);
    } catch (error) {
        if (error.code === 11000) {
            logger.warn(`[joinDebate] Participation record already exists for user ${userId} and topic ${topicId}.`);
        } else {
            logger.error(`[joinDebate] UNEXPECTED ERROR creating Participation record: ${error.message}`, error);
            throw error;
        }
    }

    const user = await User.findById(userId);
    if (user && !user.debateHistory.includes(room._id)) {
        user.debateHistory.push(room._id);
        await user.save();
        logger.info(`[joinDebate] DebateRoom ${room._id} added to user ${userId}'s debate history.`);
    } else if (!user) {
        logger.error(`[joinDebate] User ${userId} NOT FOUND when trying to update debate history.`);
    }


    if (room.status === 'pending' && room.participants.length >= MIN_PARTICIPANTS_TO_START) {
        logger.info(`[joinDebate] DebateRoom ${room._id} has ${room.participants.length} participants (enough to start). Calling autoStartDebate.`);
        autoStartDebate(room._id);
    } else if (room.status !== 'pending') {
        logger.info(`[joinDebate] DebateRoom ${room._id} is no longer pending (${room.status}). Not calling autoStartDebate.`);
    } else {
         logger.info(`[joinDebate] DebateRoom ${room._id} has ${room.participants.length} participants (not enough to auto-start yet).`);
    }

    return { roomId: room._id.toString(), isContest: false };
}


const leaveRoom = async ({ roomId, userId }) => {
    if (!injectedSocketIoHelpers?.io) {
        logger.error(`[leaveRoom] Socket.IO instance not available.`);
        return;
    }

    const room = await DebateRoom.findById(roomId);
    if (!room) {
        logger.warn(`[leaveRoom] Room ${roomId} not found for user ${userId} attempting to leave.`);
        return;
    }
    room.participants = room.participants.filter(p => p.toString() !== userId.toString());
    await room.save();
    logger.info(`[leaveRoom] User ${userId} removed from room ${roomId}. Remaining: ${room.participants.length}`);

    injectedSocketIoHelpers.io.to(roomId).emit('participant-update', { participants: room.participants.length });

    if (room.status === 'pending' && room.participants.length < MIN_PARTICIPANTS_TO_START) {
        room.status = 'cancelled';
        await room.save();
        logger.info(`[leaveRoom] Room ${roomId} CANCELLED due to insufficient participants (${room.participants.length}).`);
        injectedSocketIoHelpers.io.to(roomId).emit('phase', 'cancelled');
        injectedSocketIoHelpers.updateSocketsPhaseInRoom(roomId, 'cancelled');
    } else if (room.participants.length === 0) {
        await DebateRoom.deleteOne({ _id: roomId });
        logger.info(`[leaveRoom] Room ${roomId} is now empty and deleted.`);
        injectedSocketIoHelpers.io.to(roomId).emit('phase', 'closed');
        injectedSocketIoHelpers.updateSocketsPhaseInRoom(roomId, 'closed');
    }
}


const autoStartDebate = (roomId) => {
    logger.info(`[autoStartDebate] Setting timeout for room ${roomId} to start in ${WAIT_SECONDS} seconds.`);
    setTimeout(async () => {
        const room = await DebateRoom.findById(roomId);

        if (!room) {
            logger.warn(`[autoStartDebate] Room ${roomId} not found during auto-start timeout. It might have been deleted or finished.`);
            return;
        }

        if (room.status === 'pending' && room.participants.length >= MIN_PARTICIPANTS_TO_START) {
            room.status = 'ongoing';
            room.startedAt = Date.now();
            await room.save();
            logger.info(`[autoStartDebate] Room ${roomId} AUTO-STARTED with ${room.participants.length} participants.`);

            if (!injectedSocketIoHelpers || !injectedSocketIoHelpers.startDebateTimers) {
                logger.error(`[autoStartDebate] CRITICAL ERROR: Socket.IO helpers (startDebateTimers) not injected or is missing! Cannot proceed for room ${room._id}.`);
                room.status = 'cancelled';
                await room.save();
                if (injectedSocketIoHelpers?.io) {
                    injectedSocketIoHelpers.io.to(roomId).emit('phase', 'cancelled');
                    injectedSocketIoHelpers.updateSocketsPhaseInRoom(roomId, 'cancelled');
                }
                return;
            }
            injectedSocketIoHelpers.startDebateTimers(room._id); // This will emit 'debate-start'
        } else if (room.status === 'pending' && room.participants.length < MIN_PARTICIPANTS_TO_START) {
            room.status = 'cancelled';
            await room.save();
            logger.info(`[autoStartDebate] Room ${roomId} CANCELLED due to insufficient participants (${room.participants.length}).`);
            if (injectedSocketIoHelpers?.io) {
                injectedSocketIoHelpers.io.to(roomId).emit('phase', 'cancelled');
                injectedSocketIoHelpers.updateSocketsPhaseInRoom(roomId, 'cancelled');
            }
        } else {
            logger.info(`[autoStartDebate] Room ${roomId} is no longer pending (${room.status}). Not auto-starting or cancelling.`);
        }
    }, WAIT_SECONDS * 1000);
}


module.exports = {
    joinDebate,
    leaveRoom,
    setSocketCallbacks
};