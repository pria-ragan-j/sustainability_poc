import React, { useState } from 'react';
import { Leaf, User, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';

export default function LoginPage() {
  const { login } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    const ok = login(username.trim(), password);
    if (!ok) setError('Invalid username or password.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-header-icon">
            <Leaf size={20} color="var(--env-color)" />
          </div>
          <span className="login-title">ESG Sustainability Dashboard</span>
        </div>
        <p className="login-subtitle">Sign in to access your sustainability data.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">Username</label>
            <div className="login-input-wrap">
              <User size={15} className="login-input-icon" />
              <input
                id="login-username"
                className="login-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={15} className="login-input-icon" />
              <input
                id="login-password"
                className="login-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button type="submit" className="login-submit-btn">
            <LogIn size={15} />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
