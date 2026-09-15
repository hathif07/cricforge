import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Teams = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'team_owner');
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ teamName: '', shortName: '', color: '#000000', purseTotal: 100 });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/teams');
    setTeams(data.data.teams);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/teams', form);
      setForm({ teamName: '', shortName: '', color: '#000000', purseTotal: 100 });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create team.');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Teams</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close' : '+ New Team'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && canManage && (
        <div className="card">
          <h3>Create Team</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input className="form-input" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Short Name</label>
                <input className="form-input" maxLength={5} value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Auction Purse (Cr)</label>
                <input type="number" className="form-input" value={form.purseTotal} onChange={(e) => setForm({ ...form, purseTotal: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary">Create Team</button>
          </form>
        </div>
      )}

      <div className="card-grid">
        {teams.map((t) => (
          <Link key={t._id} to={`/teams/${t._id}`} className="card">
            <div className="card-title">
              <h3>{t.teamName}</h3>
              <span className="badge badge-outline">{t.shortName}</span>
            </div>
            <p className="muted">{t.players?.length || 0} players in squad</p>
            <p className="muted">Purse remaining: {t.purseRemaining} / {t.purseTotal} Cr</p>
          </Link>
        ))}
        {teams.length === 0 && <div className="empty-state">No teams yet.</div>}
      </div>
    </div>
  );
};

export default Teams;
