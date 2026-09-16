import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  teamId: '',
  teamName: '',
  shortName: '',
  purseTotal: 100
};

const Teams = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'team_owner');

  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const loadTeams = async () => {
    try {
      const { data } = await api.get('/teams');
      setTeams(data.data.teams);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load teams.');
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^[A-Za-z0-9_-]+$/.test(form.teamId.trim())) {
      setError(
        'Team ID can contain only letters, numbers, underscore and hyphen.'
      );
      return;
    }

    if (!/^[A-Za-z ]+$/.test(form.teamName.trim())) {
      setError('Team name can contain only letters and spaces.');
      return;
    }

    if (!/^[A-Za-z]{2,5}$/.test(form.shortName.trim())) {
      setError('Short name must contain 2 to 5 letters.');
      return;
    }

    if (Number(form.purseTotal) <= 0) {
      setError('Auction purse must be greater than 0.');
      return;
    }

    try {
      await api.post('/teams', {
        teamId: form.teamId.trim(),
        teamName: form.teamName.trim(),
        shortName: form.shortName.trim().toUpperCase(),
        purseTotal: Number(form.purseTotal)
      });

      setForm(emptyForm);
      setShowForm(false);
      await loadTeams();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not create team.'
      );
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Teams</h1>

        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setError('');
              setForm(emptyForm);
            }}
          >
            {showForm ? 'Close' : '+ New Team'}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showForm && canManage && (
        <div className="card">
          <h3>Create Team</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-row">

              <div className="form-group">
                <label className="form-label">
                  Team ID
                </label>

                <input
                  className="form-input"
                  placeholder="Example: CSK01"
                  value={form.teamId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      teamId: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Team Name
                </label>

                <input
                  className="form-input"
                  placeholder="Example: Chennai Super Kings"
                  value={form.teamName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      teamName: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Short Name
                </label>

                <input
                  className="form-input"
                  placeholder="Example: CSK"
                  maxLength={5}
                  value={form.shortName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shortName: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Auction Purse (Cr)
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="form-input"
                  value={form.purseTotal}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purseTotal: e.target.value
                    })
                  }
                  required
                />
              </div>

            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Create Team
            </button>
          </form>
        </div>
      )}

      <div className="card-grid">
        {teams.map((team) => (
          <Link
            key={team._id}
            to={`/teams/${team._id}`}
            className="card"
          >
            <div className="card-title">
              <h3>{team.teamName}</h3>

              <span className="badge badge-outline">
                {team.shortName}
              </span>
            </div>

            <p className="muted">
              Team ID: {team.teamId || '—'}
            </p>

            <p className="muted">
              {team.players?.length || 0} players in squad
            </p>

            <p className="muted">
              Purse remaining: {team.purseRemaining} / {team.purseTotal} Cr
            </p>
          </Link>
        ))}

        {teams.length === 0 && (
          <div className="empty-state">
            No teams yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;