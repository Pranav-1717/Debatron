const createLogger  = require('../utils/logger');
const logger = createLogger('AuthController');
const jsonwebtoken = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwtSecret = process.env.JWT_SECRET

const signup = async (req , res) =>{
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logger.warn('User already exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        logger.info('User created successfully', { userId: newUser._id });
        res.status(201).json({user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    }
    catch (error) {
        logger.error('Error during signup', { error });
        res.status(500).json({ message: 'Internal server error' });
    } 
}

const login = async (req, res) => {
    logger.info('Login attempt', { email: req.body.email });
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('Invalid credentials', { email });
            return res.status(404).json({ message: 'Invalid credentials' });
        }   
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {     
            logger.warn('Invalid credentials', { email });
            return res.status(401).json({ message: 'Invalid credentials' });
        }                       
        const token = jsonwebtoken.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });
        logger.info('User logged in successfully', { userId: user._id });   
        res.status(200).json({
            user: { id: user._id, username: user.username, email: user.email },
            token,
            refreshToken
        });
    } catch (error) {
        logger.error('Error during login', { error });
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    signup, 
    login
};