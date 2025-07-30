// E:\Debatron\Frontend\my-debate-arena-frontend\src\contexts\SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);

  const [currentPhase, setCurrentPhase] = useState('connecting');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [finalScores, setFinalScores] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    // Conditions to prevent socket connection before user/room data is ready
    if (!isAuthenticated || authLoading || !user?.id || !roomId) {
      if (!authLoading && !isAuthenticated) {
        console.warn("SocketContext: User not authenticated, cannot connect socket.");
      } else if (!user?.id) {
        console.warn("SocketContext: User ID not available, cannot connect socket.");
      } else if (!roomId) {
        console.warn("SocketContext: Room ID not available, cannot connect socket.");
      }
      return; // Exit early if prerequisites are not met
    }

    const BACKEND_SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_SOCKET_URL, {
      query: { userId: user.id }, // Pass userId for backend authentication middleware
    });

    setSocket(newSocket); // Store the socket instance in state

    // --- Socket Event Listeners ---
    newSocket.on('connect', () => {
      console.log('Socket.IO connected:', newSocket.id);
      newSocket.emit('join-room', { roomId }); // Immediately join the room
      setCurrentPhase('pending'); // Initial phase until server sends update
      setLiveTranscripts([]); // Clear transcripts on new connection/room join
      setFinalScores(null); // Clear scores
      setParticipantCount(0); // Reset participant count
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setCurrentPhase('error');
      alert(`Socket Connection Error: ${err.message}. Please refresh.`);
    });

    newSocket.on('room-error', (data) => {
      console.error('Room error from server:', data.message);
      alert(`Debate Room Error: ${data.message}`);
      setCurrentPhase('error'); // Indicate error state
      navigate('/'); // Redirect to home page on severe room error
    });

    newSocket.on('phase', (phase) => {
      console.log('Server emitted phase:', phase);
      setCurrentPhase(phase);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current); // Clear any running client-side timer
        timerIntervalRef.current = null;
      }
      // Handle navigation on 'cancelled' or 'closed' phases
      if (phase === 'cancelled' || phase === 'closed') {
        alert(`Debate ${phase}. Redirecting to topics.`);
        navigate('/'); // Redirect to home page
      }
    });

    newSocket.on('timer-sync', (data) => {
      console.log('Server emitted timer-sync:', data.elapsed);
      setElapsedTime(data.elapsed);
    });

    newSocket.on('new-text', (data) => {
      console.log(`New text from ${data.userId}: ${data.text}`);
      setLiveTranscripts(prev => [...prev, { userId: data.userId, text: data.text, timestamp: Date.now() }]);
    });

    newSocket.on('final-score', (scores) => {
      console.log('Server emitted final scores:', scores);
      setFinalScores(scores);
    });

    newSocket.on('participant-update', (data) => {
      console.log('Server emitted participant-update:', data.participants);
      setParticipantCount(data.participants);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setCurrentPhase('disconnected');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Optionally, alert user and redirect if unexpectedly disconnected
      // if (reason !== 'io client disconnect') { // Ignore manual disconnects
      //   alert(`Disconnected from debate: ${reason}. Please refresh.`);
      //   navigate('/');
      // }
    });

    // --- Cleanup function for useEffect ---
    return () => {
      if (newSocket) {
        console.log('Cleaning up Socket.IO connection...');
        newSocket.disconnect(); // Disconnect socket when component unmounts
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current); // Clear any active timer interval
      }
    };
  }, [isAuthenticated, authLoading, user?.id, roomId, navigate]); // Dependencies for useEffect

  // Function to emit 'leave-room' event to backend
  const leaveRoom = useCallback(() => {
    if (socket && user?.id && roomId) {
      console.log(`User ${user.id} leaving room ${roomId}.`);
      socket.emit('leave-room', { roomId, userId: user.id });
      // After emitting, navigate away from the room immediately
      navigate('/');
    } else {
      console.warn("Cannot leave room: Socket not connected or user/room info missing. Navigating anyway.");
      navigate('/'); // Fallback to navigate home if state is inconsistent
    }
  }, [socket, user?.id, roomId, navigate]);


  // Value provided by the context to its consumers
  const contextValue = {
    socket,
    currentPhase,
    elapsedTime,
    liveTranscripts,
    finalScores,
    participantCount,
    setElapsedTime, // Allow external components to update timer
    leaveRoom, // Expose leaveRoom function
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);