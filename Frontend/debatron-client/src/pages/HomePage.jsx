// E:\Debatron\Frontend\my-debate-arena-frontend\src\pages\HomePage.jsx
import React, { useEffect, useState } from 'react';
import { getAllTopics } from '../api/topics';
import TopicCard from '../components/TopicCard';

const HomePage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const data = await getAllTopics();
        setTopics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading topics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mt-5">Error: {error}</div>;
  }

  if (topics.length === 0) {
    return (
      <div className="text-center mt-5">
        <h3>No topics found.</h3>
        <p>Try creating some topics from your backend (e.g., via Postman or an admin panel).</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-center">Available Debate Topics</h2>
      <div className="row">
        {topics.map((topic) => (
          <TopicCard key={topic._id} topic={topic} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;