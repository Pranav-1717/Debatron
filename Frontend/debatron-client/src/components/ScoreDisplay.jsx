// E:\Debatron\Frontend\my-debate-arena-frontend\src\components\ScoreDisplay.jsx
import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const ScoreDisplay = () => {
  const { finalScores, currentPhase } = useSocket();
  const { user } = useAuth();

  // Only render if debate is finished and scores are available
  if (currentPhase !== 'finished' || !finalScores || (!finalScores.winner && !finalScores.error)) {
    return null;
  }

  const { winner, ...participantScores } = finalScores; // Scores might have an 'error' key if AI failed

  const getScoreClass = (userId) => {
    if (userId === winner) {
      return 'table-success'; // Highlight winner
    }
    if (userId === user?.id) {
      return 'table-info'; // Highlight current user
    }
    return '';
  };

  const participantScoreEntries = Object.entries(participantScores).filter(([key]) => key !== 'error');


  return (
    <div className="card p-3 my-3 shadow-sm">
      <h5 className="card-title text-center mb-3">Debate Results</h5>
      {winner ? (
        <div className="alert alert-success text-center h4">
          Winner: <span className="fw-bold">User {winner.substring(0, 8)}...</span>
        </div>
      ) : (
        <div className="alert alert-warning text-center h4">
          No clear winner or AI could not determine winner.
        </div>
      )}

      {participantScoreEntries.length > 0 && (
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Logic</th>
                <th>Evidence</th>
                <th>Rhetoric</th>
                <th>Respect</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {participantScoreEntries.map(([userId, scores]) => (
                <tr key={userId} className={getScoreClass(userId)}>
                  <td>{userId === user?.id ? 'You' : `User ${userId.substring(0, 8)}...`}</td>
                  <td>{scores.logic}</td>
                  <td>{scores.evidence}</td>
                  <td>{scores.rhetoric}</td>
                  <td>{scores.respect}</td>
                  <td><strong>{scores.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
      )}

      {finalScores.error && (
        <div className="alert alert-warning mt-3">
          AI Scoring Warning: {finalScores.error}. Scores might be partial or unavailable.
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;