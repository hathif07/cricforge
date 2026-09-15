import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Simulation = () => {
  const { hasRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ teamAId: '', teamBId: '', oversLimit: 20 });
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  const loadTeams = async () => {
    const { data } = await api.get('/teams');
    setTeams(data.data.teams);
  };
  const loadMatches = async () => {
    const { data } = await api.get('/module5/matches');
    setMatches(data.data.matches);
  };

  useEffect(() => { loadTeams(); loadMatches(); }, []);

  const runSimulation = async (e) => {
    e.preventDefault();
    setError('');
    if (form.teamAId === form.teamBId) {
      setError('Please select two different teams.');
      return;
    }
    try {
      const { data } = await api.post('/module5/simulate', form);
      loadMatches();
      viewMatch(data.data.match._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed.');
    }
  };

  const viewMatch = async (matchId) => {
    const { data } = await api.get(`/module5/matches/${matchId}`);
    setSelected(data.data.match);
    const { data: analyticsData } = await api.get(`/module5/matches/${matchId}/analytics`, { params: { innings: 1 } });
    setAnalytics(analyticsData.data);
  };

  return (
    <div>
      <div className="section-header"><h1>Simulation &amp; Analytics</h1></div>
      {error && <div className="alert alert-error">{error}</div>}

      {hasRole('admin', 'team_owner', 'tournament_organizer') && (
        <div className="card">
          <h3>Simulate a Match</h3>
          <form onSubmit={runSimulation} className="form-row">
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
            <div className="form-group">
              <label className="form-label">Overs</label>
              <input type="number" className="form-input" value={form.oversLimit} onChange={(e) => setForm({ ...form, oversLimit: Number(e.target.value) })} />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>Simulate</button>
          </form>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div>
          <h3>Simulated Matches</h3>
          <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
            {matches.map((m) => (
              <div key={m._id} className="card" style={{ cursor: 'pointer' }} onClick={() => viewMatch(m._id)}>
                <p>{m.teamA?.teamName} vs {m.teamB?.teamName}</p>
                <p className="muted">{m.resultMargin || m.status}</p>
              </div>
            ))}
            {matches.length === 0 && <div className="empty-state">No simulated matches yet.</div>}
          </div>
        </div>

        <div>
          {selected && (
            <div className="card">
              <h3>{selected.teamA.teamName} vs {selected.teamB.teamName}</h3>
              <p className="muted">{selected.resultMargin}</p>
              {selected.innings.map((inn) => (
                <p key={inn.inningsNumber}>Innings {inn.inningsNumber}: {inn.totalRuns}/{inn.wickets} in {inn.overs} overs</p>
              ))}

              {analytics && (
                <>
                  <h4 style={{ marginTop: 18 }}>Run Progression (Innings 1)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.progression.perOver}>
                      <CartesianGrid stroke="#e2e2e2" />
                      <XAxis dataKey="over" stroke="#000" />
                      <YAxis stroke="#000" />
                      <Tooltip />
                      <Bar dataKey="runs" fill="#000000" />
                    </BarChart>
                  </ResponsiveContainer>

                  <h4 style={{ marginTop: 18 }}>Cumulative Runs</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.progression.cumulative}>
                      <CartesianGrid stroke="#e2e2e2" />
                      <XAxis dataKey="ball" stroke="#000" />
                      <YAxis stroke="#000" />
                      <Tooltip />
                      <Line type="monotone" dataKey="runs" stroke="#000000" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>

                  <h4 style={{ marginTop: 18 }}>Phase Analysis</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Phase</th><th>Runs</th><th>Wickets</th><th>Run Rate</th></tr></thead>
                      <tbody>
                        {Object.entries(analytics.phases).map(([phase, stats]) => (
                          <tr key={phase}><td>{phase}</td><td>{stats.runs}</td><td>{stats.wickets}</td><td>{stats.runRate}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          {!selected && <div className="empty-state">Select or simulate a match to see analytics.</div>}
        </div>
      </div>
    </div>
  );
};

export default Simulation;
