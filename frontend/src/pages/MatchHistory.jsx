import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusRoute = (m, hasRole) => {
  if (m.status === 'scheduled') return `/matches/${m._id}/toss`;
  if (m.status === 'toss') return `/matches/${m._id}/playing-xi`;
  if (m.status === 'playing_xi') return `/matches/${m._id}/playing-xi`;
  if (m.status === 'live') return hasRole('admin', 'scorer') ? `/matches/${m._id}/live-scoring` : `/matches/${m._id}/live`;
  return `/matches/${m._id}/scorecard`;
};

const MatchHistory = () => {
  const { hasRole } = useAuth();
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  const loadMatches = () => {
    api.get('/matches').then(({ data }) => setMatches(data.data.matches));
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const deleteMatch = async (e, matchId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this match? This will remove all associated scorecards and data.')) return;
    setError('');
    try {
      await api.delete(`/matches/${matchId}`);
      loadMatches();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete match.');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Matches</h1>
        {hasRole('admin', 'scorer', 'tournament_organizer') && (
          <Link to="/matches/new" className="btn btn-primary">+ New Match</Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card-grid">
        {matches.map((m) => (
          <Link key={m._id} to={statusRoute(m, hasRole)} className="card">
            <div className="card-title">
              <h3>{m.teamA.name} vs {m.teamB.name}</h3>
              <span className="badge badge-outline">{m.format}</span>
            </div>
            <p className="muted">{m.venue?.name || 'Venue TBD'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span className="badge badge-solid">{m.status.replace('_', ' ')}</span>
              {hasRole('admin', 'tournament_organizer') && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => deleteMatch(e, m._id)}
                >
                  Delete
                </button>
              )}
            </div>
          </Link>
        ))}
        {matches.length === 0 && <div className="empty-state">No matches yet.</div>}
      </div>
    </div>
  );
};

export default MatchHistory;
