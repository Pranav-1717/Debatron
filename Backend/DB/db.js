// E:\Debatron\Backend\DB\db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger')('MongoDB'); // Assuming logger setup

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    // Mongoose warnings for deprecated options are handled by driver directly after 4.0.0
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;