import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusRoute = (m) => {
  if (m.status === 'scheduled') return `/matches/${m._id}/toss`;
  if (m.status === 'toss') return `/matches/${m._id}/playing-xi`;
  if (m.status === 'playing_xi') return `/matches/${m._id}/playing-xi`;
  if (m.status === 'live') return `/matches/${m._id}/live-scoring`;
  return `/matches/${m._id}/scorecard`;
};

const MatchHistory = () => {
  const { hasRole } = useAuth();
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get('/matches').then(({ data }) => setMatches(data.data.matches));
  }, []);

  return (
    <div>
      <div className="section-header">
        <h1>Matches</h1>
        {hasRole('admin', 'scorer', 'tournament_organizer') && (
          <Link to="/matches/new" className="btn btn-primary">+ New Match</Link>
        )}
      </div>

      <div className="card-grid">
        {matches.map((m) => (
          <Link key={m._id} to={statusRoute(m)} className="card">
            <div className="card-title">
              <h3>{m.teamA.name} vs {m.teamB.name}</h3>
              <span className="badge badge-outline">{m.format}</span>
            </div>
            <p className="muted">{m.venue?.name || 'Venue TBD'}</p>
            <span className="badge badge-solid">{m.status.replace('_', ' ')}</span>
          </Link>
        ))}
        {matches.length === 0 && <div className="empty-state">No matches yet.</div>}
      </div>
    </div>
  );
};

export default MatchHistory;
