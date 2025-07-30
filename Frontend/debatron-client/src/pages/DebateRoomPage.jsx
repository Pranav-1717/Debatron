// E:\Debatron\Frontend\my-debate-arena-frontend\src\pages\DebateRoomPage.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import DebateControls from '../components/DebateControls';
import LiveTranscriptDisplay from '../components/LiveTranscriptDisplay';
import TimerDisplay from '../components/TimerDisplay';
import ScoreDisplay from '../components/ScoreDisplay';

// --- CRITICAL FIX: Define constants here ---
const MIN_PARTICIPANTS_TO_START = 2; // Must match backend constant
const WAIT_SECONDS = 5;             // Must match backend constant
// --- END CRITICAL FIX ---


const DebateRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    currentPhase,
    socket,
    participantCount,
  } = useSocket();

  const containerStyle = {
    minHeight: 'calc(100vh - 120px)', // Adjusts based on header/footer
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Distributes space vertically
  };

  return (
    <div className="container" style={containerStyle}>
      <h2 className="text-center my-3">Debate Room: {roomId.substring(0, 8)}...</h2>

      {/* Global connection and error messages */}
      {!socket && currentPhase === 'connecting' && (
        <div className="alert alert-info text-center">Attempting to connect to debate...</div>
      )}
      {currentPhase === 'error' && (
        <div className="alert alert-danger text-center">Error connecting to debate or room. Please try again.</div>
      )}
      {currentPhase === 'disconnected' && (
        <div className="alert alert-warning text-center">Disconnected from debate. Please refresh to rejoin.</div>
      )}
      {currentPhase === 'cancelled' && (
        <div className="alert alert-danger text-center">Debate Cancelled: Not enough participants joined.</div>
      )}
      {currentPhase === 'closed' && (
        <div className="alert alert-secondary text-center">This debate room has been closed.</div>
      )}

      {/* Main debate UI components - visible when connected and in an active phase */}
      {socket?.connected && ['connecting', 'pending', 'debate-start', 'finished'].includes(currentPhase) && (
        <>
          <TimerDisplay />
          <DebateControls />
          <LiveTranscriptDisplay />
          {/* ScoreDisplay will only show content when debate is 'finished' and scores are available */}
          <ScoreDisplay />
        </>
      )}

      {/* Dynamic waiting messages for the 'pending' phase */}
      {currentPhase === 'pending' && (
        <div className="alert alert-info text-center mt-4">
          {/* Display different messages based on participant count */}
          {participantCount === 1 ? (
            <>
              <p className="lead">You are the only one in the room so far.</p>
              <p>Need at least {MIN_PARTICIPANTS_TO_START} participants to start.</p>
            </>
          ) : participantCount >= MIN_PARTICIPANTS_TO_START ? (
            <>
              <p className="lead">Room has {participantCount} participants. Debate starting in {WAIT_SECONDS} seconds!</p>
              <p>Prepare for the debate to begin.</p>
            </>
          ) : (
            <p className="lead">Waiting for participants to join...</p> // Fallback if count is 0 or still loading
          )}
        </div>
      )}

      {/* Button to go back to topics page when debate is cancelled, closed, or finished */}
      {(currentPhase === 'cancelled' || currentPhase === 'closed' || currentPhase === 'finished') && (
        <div className="text-center mt-3">
          <button className="btn btn-info" onClick={() => navigate('/')}>
            Back to Topics
          </button>
        </div>
      )}
    </div>
  );
};

export default DebateRoomPage;