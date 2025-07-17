const createLogger  = require('../utils/logger');
const logger = createLogger('AuthMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const validateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        logger.warn("Access attempt without valid token!");
        return res.status(401).json({
            message: "Authentication required",
            success: false,
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch full user from DB using ID in token
        const user = await User.findById(decoded.id);
        if (!user) {
            logger.warn("Token is not valid!");
            return res.status(404).json({ message: "Invalid token", success: false });
        }

        req.user = user; // Now you have full user including storeId if applicable
        next();

    } catch (err) {
        logger.warn("Invalid token!", err.message);
        return res.status(403).json({
            message: "Invalid token!",
            success: false,
        });
    }
};

module.exports = validateToken;
