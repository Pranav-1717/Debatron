import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

// Define phase durations (should match CAPTURE_MS on the backend)
const PHASE_DURATIONS = {
  debate: 15 * 1000 // 15 seconds
};

const TimerDisplay = () => {
  const { currentPhase, elapsedTime: serverElapsedTime } = useSocket();
  const [displayTime, setDisplayTime] = useState('00:00');
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // No active timer for these phases
    if (
      serverElapsedTime === undefined ||
      currentPhase === 'pending' ||
      currentPhase === 'connecting' ||
      currentPhase === 'error' ||
      currentPhase === 'disconnected' ||
      currentPhase === 'cancelled' ||
      currentPhase === 'closed'
    ) {
      setDisplayTime('00:00');
      return;
    }

    let totalPhaseDuration = 0;
    let initialElapsedForPhase = 0; // Elapsed time for the current phase from the server's perspective

    switch (currentPhase) {
      case 'debate-start':
        totalPhaseDuration = PHASE_DURATIONS.debate;
        initialElapsedForPhase = serverElapsedTime;
        break;
      case 'finished':
        // Show 00:00 when finished
        setDisplayTime('00:00');
        return;
      default:
        setDisplayTime('00:00');
        return;
    }

    // Start local countdown timer based on the time remaining at the server
    let currentRemaining = Math.max(0, totalPhaseDuration - initialElapsedForPhase);
    startTimeRef.current = Date.now(); // Record the local start time

    const updateTimer = () => {
      const now = Date.now();
      const timePassedLocally = now - startTimeRef.current;
      const actualRemaining = Math.max(0, currentRemaining - timePassedLocally);

      const minutes = Math.floor(actualRemaining / 60000);
      const seconds = Math.floor((actualRemaining % 60000) / 1000);
      setDisplayTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      if (actualRemaining <= 0) {
        clearInterval(intervalRef.current);
        setDisplayTime('00:00');
      }
    };

    // Update immediately on first render
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 100); // Smooth update every 100ms

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentPhase, serverElapsedTime]); // Re-run when phase or elapsed time changes

  const getTimerClass = (phase) => {
    switch (phase) {
      case 'debate-start': return 'text-success'; // Green for active debate
      default: return 'text-primary';             // Blue for pending/other states
    }
  };

  return (
    <div className="card p-3 my-3 shadow-sm text-center">
      <h5 className="card-title">Time Remaining</h5>
      <h1 className={`display-3 fw-bold ${getTimerClass(currentPhase)}`}>{displayTime}</h1>
    </div>
  );
};

export default TimerDisplay;
