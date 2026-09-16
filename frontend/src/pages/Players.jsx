import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  name: '',
  dob: '',
  age: '',
  role: 'Batter',
  battingStyle: 'Right Hand',
  bowlingStyle: 'Not Specified',
  jerseyNumber: '',
  battingRating: 50,
  bowlingRating: 50,
  basePrice: 0.5
};

const bowlingStyles = [
  'Right Arm Fast',
  'Right Arm Medium Fast',
  'Right Arm Medium',
  'Right Arm Off Break',
  'Right Arm Leg Break',
  'Left Arm Fast',
  'Left Arm Medium Fast',
  'Left Arm Medium',
  'Left Arm Orthodox',
  'Left Arm Chinaman',
  'Not Specified'
];

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
    try {
      const { data } = await api.get('/players', { params: { search } });
      setPlayers(data.data.players);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load players.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const calculateAge = (dob) => {
    if (!dob) return '';

    const birthDate = new Date(`${dob}T00:00:00`);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const handleDobChange = (value) => {
    const today = new Date().toISOString().split('T')[0];

    if (value > today) {
      setError('Date of Birth cannot be in the future.');
      setForm({ ...form, dob: '', age: '' });
      return;
    }

    const calculatedAge = calculateAge(value);

    setError('');

    setForm({
      ...form,
      dob: value,
      age: calculatedAge
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();

    if (!name) {
      setError('Player name is required.');
      return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setError('Player name can contain only letters and spaces.');
      return;
    }

    if (!form.dob) {
      setError('Date of Birth is required.');
      return;
    }

    const age = calculateAge(form.dob);

    if (age < 10 || age > 80) {
      setError('Player age must be between 10 and 80 years.');
      return;
    }

    const jerseyNumber = Number(form.jerseyNumber);

    if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      setError('Jersey number must be an integer between 1 and 99.');
      return;
    }

    const battingRating = Number(form.battingRating);
    const bowlingRating = Number(form.bowlingRating);

    if (
      !Number.isInteger(battingRating) ||
      battingRating < 0 ||
      battingRating > 100
    ) {
      setError('Batting rating must be an integer between 0 and 100.');
      return;
    }

    if (
      !Number.isInteger(bowlingRating) ||
      bowlingRating < 0 ||
      bowlingRating > 100
    ) {
      setError('Bowling rating must be an integer between 0 and 100.');
      return;
    }

    const basePrice = Number(form.basePrice);

    if (!Number.isFinite(basePrice) || basePrice <= 0 || basePrice > 20) {
      setError('Auction base price must be between 0 and 20 Cr.');
      return;
    }

    const payload = {
      ...form,
      name,
      age,
      jerseyNumber,
      battingRating,
      bowlingRating,
      basePrice
    };

    try {
      if (editingId) {
        await api.put(`/players/${editingId}`, payload);
      } else {
        await api.post('/players', payload);
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
    let dob = '';

    if (p.dob) {
      dob = new Date(p.dob).toISOString().split('T')[0];
    }

    setForm({
      name: p.name || '',
      dob,
      age: p.age || '',
      role: p.role || 'Batter',
      battingStyle: p.battingStyle || 'Not Specified',
      bowlingStyle: p.bowlingStyle || 'Not Specified',
      jerseyNumber: p.jerseyNumber || '',
      battingRating: p.battingRating ?? 50,
      bowlingRating: p.bowlingRating ?? 50,
      basePrice: p.basePrice ?? 0.5
    });

    setEditingId(p._id);
    setShowForm(true);
    setError('');
  };

  const deletePlayer = async (id) => {
    if (!window.confirm('Delete this player?')) return;

    try {
      await api.delete(`/players/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete player.');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Player Database</h1>

        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setForm(emptyForm);
              setError('');
            }}
          >
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
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter player name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dob}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDobChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.age}
                  readOnly
                  placeholder="Auto calculated"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option>Batter</option>
                  <option>Bowler</option>
                  <option>All-rounder</option>
                  <option>Wicketkeeper</option>
                </select>
              </div>

            </div>

            <div className="form-row">

              <div className="form-group">
                <label className="form-label">Jersey #</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  className="form-input"
                  value={form.jerseyNumber}
                  onChange={(e) =>
                    setForm({ ...form, jerseyNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Batting Style</label>
                <select
                  className="form-select"
                  value={form.battingStyle}
                  onChange={(e) =>
                    setForm({ ...form, battingStyle: e.target.value })
                  }
                >
                  <option>Right Hand</option>
                  <option>Left Hand</option>
                  <option>Not Specified</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bowling Style</label>
                <select
                  className="form-select"
                  value={form.bowlingStyle}
                  onChange={(e) =>
                    setForm({ ...form, bowlingStyle: e.target.value })
                  }
                >
                  {bowlingStyles.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Batting Rating (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="form-input"
                  value={form.battingRating}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      battingRating: e.target.value
                    })
                  }
                />
              </div>

            </div>

            <div className="form-row">

              <div className="form-group">
                <label className="form-label">Bowling Rating (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="form-input"
                  value={form.bowlingRating}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bowlingRating: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Auction Base Price (Cr)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="20"
                  step="0.1"
                  className="form-input"
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      basePrice: e.target.value
                    })
                  }
                />
              </div>

            </div>

            <button className="btn btn-primary">
              {editingId ? 'Update Player' : 'Create Player'}
            </button>

          </form>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="form-row"
        style={{ margin: '18px 0' }}
      >
        <input
          className="form-input"
          placeholder="Search players"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn">Search</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Role</th>
              <th>Team</th>
              <th>Bat Rtg</th>
              <th>Bowl Rtg</th>
              <th>Base Price</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.age ?? '-'}</td>
                <td>{p.role}</td>
                <td>{p.teamId?.teamName || '—'}</td>
                <td>{p.battingRating}</td>
                <td>{p.bowlingRating}</td>
                <td>{p.basePrice} Cr</td>
                <td>
                  {p.isSold ? (
                    <span className="badge badge-solid">Sold</span>
                  ) : (
                    <span className="badge badge-outline">
                      Available
                    </span>
                  )}
                </td>

                {canManage && (
                  <td>
                    <div className="btn-row">
                      <button
                        className="btn btn-sm"
                        onClick={() => editPlayer(p)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deletePlayer(p._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {players.length === 0 && (
          <div className="empty-state">No players found.</div>
        )}
      </div>
    </div>
  );
};

export default Players;