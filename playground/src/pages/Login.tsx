import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon large"></div>
          <h2>Welcome to VisionStream</h2>
          <p>{isSignUp ? 'Create a new account' : 'Sign in to your dashboard'}</p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {error && (
            <div className="alert error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" size={18} />
              <input 
                type="email" 
                className="text-input with-icon" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input 
                type="password" 
                className="text-input with-icon" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button className="text-btn" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
