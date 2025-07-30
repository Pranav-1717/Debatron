// E:\Debatron\Backend\server.js
const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./DB/db');
const authRoutes = require('./routes/auth_routes');
const topicRoutes = require('./routes/topic_routes');
const validateToken = require('./middlewares/authmiddleware');

const roomService = require('./services/roomService'); // Import roomService here
const { startSocketServer } = require('./socket'); // Import startSocketServer from socket.js
const { joinRoom: roomControllerJoinRoom } = require('./controllers/roomController');


dotenv.config();

console.log("\n--- DEBUGGING ENVIRONMENT VARIABLES (SERVER START) ---");
console.log("process.env.JWT_SECRET type:", typeof process.env.JWT_SECRET, "value:", process.env.JWT_SECRET ? '[SET]' : '[NOT SET]');
console.log("process.env.GEMINI_API_KEY type:", typeof process.env.GEMINI_API_KEY, "value:", process.env.GEMINI_API_KEY ? '[SET]' : '[NOT SET]');
console.log("process.env.DEEPGRAM_KEY type:", typeof process.env.DEEPGRAM_KEY, "value:", process.env.DEEPGRAM_KEY ? '[SET]' : '[NOT SET]');
console.log("process.env.MONGODB_URI type:", typeof process.env.MONGODB_URI, "value:", process.env.MONGODB_URI ? '[SET]' : '[NOT SET]');
console.log("--- END DEBUGGING ---\n");

connectDB();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Initialize Socket.IO server and get the io instance and its directly exported helper functions
const socketIoExports = startSocketServer(server); // socketIoExports will contain { io, startDebateTimers, updateSocketsPhaseInRoom, setRoomServiceLeaveRoomCallback }
const ioInstance = socketIoExports.io; // Direct io instance

// --- Dependency Injection for roomService ---
// Pass the actual io instance and the specific helper functions directly to roomService's setter
roomService.setSocketCallbacks({
    io: ioInstance, // Pass the direct io instance
    startDebateTimers: socketIoExports.startDebateTimers, // Pass the function reference
    updateSocketsPhaseInRoom: socketIoExports.updateSocketsPhaseInRoom, // Pass the helper function
});

// --- Dependency Injection for socket.js ---
// Pass roomService's leaveRoom function to socket.js
socketIoExports.setRoomServiceCallbacks({ leaveRoom: roomService.leaveRoom });


// Routes
app.use('/api/auth', authRoutes);

const roomRoutes = express.Router();
roomRoutes.post('/join', roomControllerJoinRoom);
app.use('/api/rooms', validateToken, roomRoutes);

app.use('/api/topics', topicRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Shutting down...', promise, 'Reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', error.message, error.stack);
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});