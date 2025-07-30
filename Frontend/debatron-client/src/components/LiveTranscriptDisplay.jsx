// E:\Debatron\Frontend\my-debate-arena-frontend\src\components\LiveTranscriptDisplay.jsx
import React, { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const LiveTranscriptDisplay = () => {
  const { liveTranscripts } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscripts]);

  return (
    <div className="card p-3 my-3 shadow-sm" style={{ height: '400px', overflowY: 'auto' }}>
      <h5 className="card-title mb-3">Live Transcript</h5>
      <ul className="list-unstyled mb-0">
        {liveTranscripts.length === 0 ? (
          <li className="text-center text-muted">No one has spoken yet.</li>
        ) : (
          liveTranscripts.map((msg, index) => (
            <li
              key={index}
              className={`d-flex ${msg.userId === user?.id ? 'justify-content-end' : 'justify-content-start'} mb-2`}
            >
              <div
                className={`p-2 rounded ${msg.userId === user?.id ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                style={{ maxWidth: '80%' }}
              >
                <small className="text-muted d-block mb-1">
                  {msg.userId === user?.id ? 'You' : `User ${msg.userId.substring(0, 4)}...`}
                </small>
                {msg.text}
              </div>
            </li>
          ))
        )}
        <div ref={messagesEndRef} />
      </ul>
    </div>
  );
};

export default LiveTranscriptDisplay;