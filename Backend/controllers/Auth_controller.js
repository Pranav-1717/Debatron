// E:\Debatron\Backend\controllers\Auth_controller.js
const createLogger = require('../utils/logger');
const logger = createLogger('AuthController');
const jsonwebtoken = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Using bcryptjs, make sure it's installed
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env
const jwtSecret = process.env.JWT_SECRET; // Ensure JWT_SECRET is set in .env

const signup = async (req , res) =>{
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logger.warn('User already exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }
        // Password hashing is handled by pre-save hook in User model now
        const newUser = new User({ username, email, password });
        await newUser.save();
        logger.info('User created successfully', { userId: newUser._id });
        res.status(201).json({ user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    }
    catch (error) {
        logger.error('Error during signup', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal server error during signup' });
    }
}

const login = async (req, res) => {
    logger.info('Login attempt', { email: req.body.email });
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('Invalid credentials - User not found', { email });
            return res.status(404).json({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await user.comparePassword(password); // Using method defined in User model
        if (!isPasswordValid) {
            logger.warn('Invalid credentials - Password mismatch', { email });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT and Refresh Token
        if (!jwtSecret) {
            logger.error('JWT_SECRET is not set in environment variables!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }
        const token = jsonwebtoken.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });

        logger.info('User logged in successfully', { userId: user._id });
        res.status(200).json({
            user: { id: user._id, username: user.username, email: user.email, isPremium: user.isPremium },
            token,
            refreshToken
        });
    } catch (error) {
        logger.error('Error during login', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal server error during login' });
    }
}

module.exports = {
    signup,
    login
};