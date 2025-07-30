// E:\Debatron\Backend\controllers\topic_controller.js
const createLogger = require('../utils/logger');
const logger = createLogger('TopicController');
const Topic = require('../models/Topic');

const createTopic = async (req, res) => {
    const { title, description, isPremium, tags } = req.body;

    try {
        const existingTopic = await Topic.findOne({ title });
        if (existingTopic) {
            logger.warn('Topic already exists', { title });
            return res.status(400).json({ message: 'Topic already exists' });
        }
        const newTopic = new Topic({ title, description, isPremium, tags });
        await newTopic.save();
        logger.info('Topic created successfully', { topicId: newTopic._id });
        res.status(201).json({ topic: newTopic });
    } catch (error) {
        logger.error('Error during topic creation', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal server error during topic creation' });
    }
}

const getTopic = async (req, res) => {
    const { id } = req.params;

    try {
        const topic = await Topic.findById(id);
        if (!topic) {
            logger.warn('Topic not found', { id });
            return res.status(404).json({ message: 'Topic not found' });
        }
        logger.info('Topic retrieved successfully', { topicId: topic._id });
        res.status(200).json({ topic });
    } catch (error) {
        logger.error('Error retrieving topic', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal server error retrieving topic' });
    }
}

const getAllTopics = async (req, res) => {
    try {
        const topics = await Topic.find();
        logger.info('All topics retrieved successfully', { count: topics.length });
        res.status(200).json({ topics });
    } catch (error) {
        logger.error('Error retrieving all topics', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal server error retrieving all topics' });
    }
}

module.exports = {
    createTopic,
    getTopic,
    getAllTopics
};