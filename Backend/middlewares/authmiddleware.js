// E:\Debatron\Backend\middlewares\auth_middleware.js
const createLogger = require('../utils/logger');
const logger = createLogger('AuthMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const validateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        logger.warn("Access attempt without token!");
        return res.status(401).json({
            message: "Authentication required: No token provided.",
            success: false,
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
             logger.error('JWT_SECRET is not set in environment variables! Cannot verify token.');
             return res.status(500).json({ message: 'Server configuration error.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info(`Token decoded for user ID: ${decoded.id}`);

        const user = await User.findById(decoded.id);
        if (!user) {
            logger.warn(`Token provided for non-existent user ID: ${decoded.id}`);
            return res.status(404).json({ message: "Invalid token: User not found.", success: false });
        }

        req.user = user;
        logger.info(`User ${user.username} authenticated. Proceeding.`);
        next();

    } catch (err) {
        logger.warn(`Invalid token! Error: ${err.message}`);
        let message = "Invalid token!";
        if (err.name === 'TokenExpiredError') {
            message = "Token expired. Please log in again.";
        } else if (err.name === 'JsonWebTokenError') {
            message = "Invalid token signature.";
        }
        return res.status(403).json({
            message: message,
            success: false,
        });
    }
};

module.exports = validateToken;