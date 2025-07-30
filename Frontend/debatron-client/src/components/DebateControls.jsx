// E:\Debatron\Frontend\my-debate-arena-frontend\src\components\DebateControls.jsx
import React from 'react';
import useMicrophone from '../hooks/useMicrophone';
import { useSocket } from '../contexts/SocketContext';

const DebateControls = () => {
  const { isRecording, startRecording, stopRecording } = useMicrophone();
  const { currentPhase, socket, leaveRoom } = useSocket();

  // Mic is active only during 'debate-start' phase
  const isMicActivePhase = currentPhase === 'debate-start';
  const isSocketConnected = socket?.connected;

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getPhaseText = (phase) => {
    switch (phase) {
      case 'connecting': return 'Connecting to Debate...';
      case 'pending': return 'Waiting for Debate to Start...';
      case 'debate-start': return 'Debate In Progress (Speak Now!)';
      case 'finished': return 'Debate Finished!';
      case 'error': return 'Connection Error!';
      case 'disconnected': return 'Disconnected from Debate.';
      case 'cancelled': return 'Debate Cancelled: Not enough participants.';
      case 'closed': return 'Room Closed.';
      default: return phase;
    }
  };

  const getPhaseClass = (phase) => {
    switch (phase) {
      case 'connecting': return 'text-info';
      case 'pending': return 'text-warning';
      case 'debate-start': return 'text-success';
      case 'finished': return 'text-secondary';
      case 'error': return 'text-danger';
      case 'disconnected': return 'text-muted';
      case 'cancelled': return 'text-danger';
      case 'closed': return 'text-danger';
      default: return '';
    }
  };


  return (
    <div className="card p-3 my-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className={`mb-0 ${getPhaseClass(currentPhase)}`}>
          Phase: {getPhaseText(currentPhase)}
        </h5>
        <button
          className={`btn btn-lg ${isRecording ? 'btn-danger' : 'btn-success'}`}
          onClick={handleMicToggle}
          disabled={!isSocketConnected || (!isMicActivePhase && !isRecording)}
          title={!isSocketConnected ? 'Socket not connected' : (!isMicActivePhase && !isRecording ? 'Mic active only during debate phase' : '')}
        >
          <i className={`bi ${isRecording ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`}></i>
          {isRecording ? ' Stop Speaking' : ' Start Speaking'}
        </button>
      </div>

      {(currentPhase === 'pending' || currentPhase === 'debate-start') && ( // Show 'Leave' button during active or pending phases
        <div className="text-center mt-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={leaveRoom}
            disabled={!isSocketConnected}
          >
            Leave Debate
          </button>
        </div>
      )}

      {!isSocketConnected && <p className="text-danger mt-2">Socket not connected. Please wait or refresh.</p>}
    </div>
  );
};

export default DebateControls;