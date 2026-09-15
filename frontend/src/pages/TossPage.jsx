import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const TossPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [winner, setWinner] = useState('');
  const [decision, setDecision] = useState('bat');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/matches/${id}`).then(({ data }) => setMatch(data.data.match));
  }, [id]);

  const submitToss = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/matches/${id}/toss`, { winner, decision });
      navigate(`/matches/${id}/playing-xi`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record toss.');
    }
  };

  if (!match) return <div className="spinner" />;

  return (
    <div>
      <div className="section-header"><h1>Toss</h1></div>
      <p className="muted">{match.teamA.name} vs {match.teamB.name} &middot; {match.format}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={submitToss}>
          <div className="form-group">
            <label className="form-label">Toss Winner</label>
            <select className="form-select" value={winner} onChange={(e) => setWinner(e.target.value)} required>
              <option value="">Select…</option>
              <option value={match.teamA.id}>{match.teamA.name}</option>
              <option value={match.teamB.id}>{match.teamB.name}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Decision</label>
            <div className="btn-row">
              <label className="form-check">
                <input type="radio" checked={decision === 'bat'} onChange={() => setDecision('bat')} /> Bat First
              </label>
              <label className="form-check">
                <input type="radio" checked={decision === 'bowl'} onChange={() => setDecision('bowl')} /> Bowl First
              </label>
            </div>
          </div>
          <button className="btn btn-primary">Confirm Toss &amp; Continue</button>
        </form>
      </div>
    </div>
  );
};

export default TossPage;
