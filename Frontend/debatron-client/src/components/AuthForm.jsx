// E:\Debatron\Frontend\my-debate-arena-frontend\src\components\AuthForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthForm = ({ isLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { login, signup, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        await login(email, password);
        setSuccess('Login successful!');
      } else {
        await signup(username, email, password);
        setSuccess('Signup successful! Please log in.');
        setUsername('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="card p-4 shadow-sm">
      <h2 className="card-title text-center mb-4">{isLogin ? 'Login' : 'Signup'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="mb-3">
            <label htmlFor="usernameInput" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="usernameInput"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
            />
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="emailInput" className="form-label">Email address</label>
          <input
            type="email"
            className="form-control"
            id="emailInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="passwordInput" className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            id="passwordInput"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
          {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Signup')}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;