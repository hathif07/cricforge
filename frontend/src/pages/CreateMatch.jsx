import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateMatch = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ teamAId: '', teamBId: '', format: 'T20', oversPerInnings: 20, venueName: '', venueCity: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teams').then(({ data }) => setTeams(data.data.teams));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.teamAId === form.teamBId) {
      setError('Please select two different teams.');
      return;
    }
    const teamA = teams.find((t) => t._id === form.teamAId);
    const teamB = teams.find((t) => t._id === form.teamBId);

    try {
      const { data } = await api.post('/matches', {
        teamA: { id: teamA._id, name: teamA.teamName },
        teamB: { id: teamB._id, name: teamB.teamName },
        format: form.format,
        oversPerInnings: form.format === 'Custom' ? Number(form.oversPerInnings) : undefined,
        venue: { name: form.venueName, city: form.venueCity }
      });
      navigate(`/matches/${data.data.match._id}/toss`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create match.');
    }
  };

  return (
    <div>
      <div className="section-header"><h1>Create Match</h1></div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Team A</label>
              <select className="form-select" value={form.teamAId} onChange={(e) => setForm({ ...form, teamAId: e.target.value })} required>
                <option value="">Select…</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team B</label>
              <select className="form-select" value={form.teamBId} onChange={(e) => setForm({ ...form, teamBId: e.target.value })} required>
                <option value="">Select…</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Format</label>
              <select className="form-select" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                <option>T20</option><option>ODI</option><option>Test</option><option>Custom</option>
              </select>
            </div>
            {form.format === 'Custom' && (
              <div className="form-group">
                <label className="form-label">Overs Per Innings</label>
                <input type="number" className="form-input" value={form.oversPerInnings} onChange={(e) => setForm({ ...form, oversPerInnings: e.target.value })} />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Venue Name</label>
              <input className="form-input" value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.venueCity} onChange={(e) => setForm({ ...form, venueCity: e.target.value })} />
            </div>
          </div>

          <button className="btn btn-primary">Create Match &amp; Proceed to Toss</button>
        </form>
      </div>
    </div>
  );
};

export default CreateMatch;
