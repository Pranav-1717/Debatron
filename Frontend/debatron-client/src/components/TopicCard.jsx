// E:\Debatron\Frontend\my-debate-arena-frontend\src\components\TopicCard.jsx
import React from 'react';
import { joinRoom } from '../api/rooms';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TopicCard = ({ topic }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleJoin = async () => {
    try {
      let mode = 'ranked'; // Default assumption for first click

      if (topic.isPremium && !user?.isPremium) {
        alert("You need a premium account to join this premium topic.");
        return;
      }

      const result = await joinRoom(topic._id, mode); // topic._id is correctly passed here
      console.log(`Joined room: ${result.roomId}, Is Contest: ${result.isContest}`);
      navigate(`/room/${result.roomId}`);
    } catch (error) {
      alert(`Failed to join room: ${error}`);
    }
  };

  return (
    <div className="col-md-4 mb-4">
      <div className="card shadow-sm h-100">
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{topic.title}</h5>
          <p className="card-text text-muted">{topic.description}</p>
          <div className="mt-auto">
            {topic.tags && topic.tags.length > 0 && (
              <div className="mb-2">
                {topic.tags.map((tag, index) => (
                  <span key={index} className="badge bg-secondary me-1">{tag}</span>
                ))}
              </div>
            )}
            {topic.isPremium && (
              <span className="badge bg-warning text-dark me-1">Premium</span>
            )}
            <button
              className="btn btn-primary mt-3 w-100"
              onClick={handleJoin}
              disabled={topic.isPremium && !user?.isPremium}
            >
              {topic.isPremium && !user?.isPremium ? 'Premium Required' : 'Join Debate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicCard;