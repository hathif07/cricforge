import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', age: '', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', jerseyNumber: '', battingRating: 50, bowlingRating: 50, basePrice: 0.5 };

const Players = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'team_owner');
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data } = await api.get('/players', { params: { search } });
    setPlayers(data.data.players);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/players/${editingId}`, form);
      } else {
        await api.post('/players', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save player.');
    }
  };

  const editPlayer = (p) => {
    setForm({
      name: p.name, age: p.age || '', role: p.role, battingStyle: p.battingStyle,
      bowlingStyle: p.bowlingStyle, jerseyNumber: p.jerseyNumber || '',
      battingRating: p.battingRating, bowlingRating: p.bowlingRating, basePrice: p.basePrice
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const deletePlayer = async (id) => {
    if (!window.confirm('Delete this player?')) return;
    await api.delete(`/players/${id}`);
    load();
  };

  return (
    <div>
      <div className="section-header">
        <h1>Player Database</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
            {showForm ? 'Close' : '+ Add Player'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && canManage && (
        <div className="card">
          <h3>{editingId ? 'Edit Player' : 'New Player'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input type="number" className="form-input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option>Batter</option><option>Bowler</option><option>All-rounder</option><option>Wicketkeeper</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Jersey #</label>
                <input type="number" className="form-input" value={form.jerseyNumber} onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Batting Style</label>
                <select className="form-select" value={form.battingStyle} onChange={(e) => setForm({ ...form, battingStyle: e.target.value })}>
                  <option>Right Hand</option><option>Left Hand</option><option>Not Specified</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Style</label>
                <input className="form-input" value={form.bowlingStyle} onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Batting Rating (0-100)</label>
                <input type="number" min={0} max={100} className="form-input" value={form.battingRating} onChange={(e) => setForm({ ...form, battingRating: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Rating (0-100)</label>
                <input type="number" min={0} max={100} className="form-input" value={form.bowlingRating} onChange={(e) => setForm({ ...form, bowlingRating: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label className="form-label">Auction Base Price (Cr)</label>
              <input type="number" step="0.1" className="form-input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            </div>
            <button className="btn btn-primary">{editingId ? 'Update Player' : 'Create Player'}</button>
          </form>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="form-row" style={{ margin: '18px 0' }}>
        <input className="form-input" placeholder="Search players" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn">Search</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Team</th><th>Bat Rtg</th><th>Bowl Rtg</th><th>Base Price</th><th>Status</th>{canManage && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.role}</td>
                <td>{p.teamId?.teamName || '—'}</td>
                <td>{p.battingRating}</td>
                <td>{p.bowlingRating}</td>
                <td>{p.basePrice} Cr</td>
                <td>{p.isSold ? <span className="badge badge-solid">Sold</span> : <span className="badge badge-outline">Available</span>}</td>
                {canManage && (
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-sm" onClick={() => editPlayer(p)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deletePlayer(p._id)}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {players.length === 0 && <div className="empty-state">No players found.</div>}
      </div>
    </div>
  );
};

export default Players;
