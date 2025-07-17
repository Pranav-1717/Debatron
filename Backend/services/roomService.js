import DebateRoom from '../models/DebateRoom.js';
import Participation from '../models/Participation.js';
import Topic from '../models/Topic.js';
import redis from '../utils/redisClient.js';
const createLogger  = require('../utils/logger');
import { startDebateTimers } from '../socket.js';
const logger = createLogger('RoomService');
import crypto from 'crypto';

const MAX_ROOM_SIZE = 6;
const WAIT_SECONDS  = 15;

const joinTopic = async ({ userId, topicId, mode }) => {
  // const topic = await Topic.findById(topicId);
  // if (!topic) throw new Error('Topic not found');
  // if (topic.isPremium == false && mode === 'contest') throw new Error('Contest not allowed on non-premium topics');
  return mode === 'ranked' ? joinRanked(userId, topicId) : joinContest(userId, topicId);
}

const joinRanked = async (userId, topicId) => {
  
  let room = await DebateRoom.findOne({ topicId, status: 'pending', isPremiumRoom: topic.isPremium }).sort({ createdAt: 1 });
  if (!room || room.participants.length >= MAX_ROOM_SIZE) {
    room = await DebateRoom.create({ topicId, participants: [], isPremiumRoom: topic.isPremium });
  }
  room.participants.push(userId);
  await room.save();
  await Participation.create({ userId, topicId, roomId: room._id });

  //store user in debate history
  const user  = await User.findById(userId);
  user.debateHistory.push(room._id);

  if (room.participants.length > 1) autoStartRanked(room._id);
  return { roomId: room._id.toString(), isContest: false };
}
 
const joinContest = async (userId, topicId) => {
  const listKey = `contest:${topicId}:rooms`;
  let roomId = await redis.lIndex(listKey, -1);
  let size   = roomId ? await redis.sCard(`contest:room:${roomId}:users`) : 0;
  if (!roomId || size >= MAX_ROOM_SIZE) {
    roomId = crypto.randomUUID();
    await redis.rPush(listKey, roomId);
  }
  await redis.sAdd(`contest:room:${roomId}:users`, userId);
  await redis.expire(`contest:room:${roomId}:users`, 7200);

  const startKey = `contest:room:${roomId}:start`;
  if (await redis.set(startKey, '1', { NX: true, EX: WAIT_SECONDS })) {
    logger.info(`Contest room ${roomId} auto‑starts in ${WAIT_SECONDS}s`);
  }
  return { roomId, isContest: true };
}

const autoStartRanked = (roomId) => {
  setTimeout(async () => {
    const room = await DebateRoom.findById(roomId);
    if (room && room.status === 'pending') {
      room.status = 'ongoing';
      room.startedAt = Date.now();
      await room.save();
      startDebateTimers(room._id);
      logger.info(`Ranked room ${roomId} started automatically`);
    }
  }, WAIT_SECONDS * 1000);
}

module.exports = {
  joinTopic,
  joinRanked,
  joinContest,
  autoStartRanked
};

