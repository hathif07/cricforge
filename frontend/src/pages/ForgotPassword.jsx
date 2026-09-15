import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestToken = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage('If that email exists, a reset token has been generated below (shown here for demo purposes since there is no email service wired up).');
      if (data.resetToken) setResetToken(data.resetToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not process request.');
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword });
      setMessage('Password reset successfully. You can now log in.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={requestToken}>
          <div className="form-group">
            <label className="form-label">Account Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-block">Request Reset Token</button>
        </form>

        <hr className="divider" />

        <form onSubmit={resetPassword}>
          <div className="form-group">
            <label className="form-label">Reset Token</label>
            <input className="form-input" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" minLength={6} className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block">Reset Password</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16 }}><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
};

export default ForgotPassword;
