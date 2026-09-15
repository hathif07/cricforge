import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({ players: 0, teams: 0, matches: 0, simMatches: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [players, teams, matches, sims] = await Promise.all([
          api.get('/players'),
          api.get('/teams'),
          api.get('/matches'),
          api.get('/module5/matches')
        ]);
        setStats({
          players: players.data.data.count,
          teams: teams.data.data.count,
          matches: matches.data.data.matches.length,
          simMatches: sims.data.data.matches.length
        });
      } catch (err) {
        // dashboard tiles are best-effort
      }
    };
    load();
  }, []);

  return (
    <div>
      <div className="section-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>{user?.name}</h1>
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: 32 }}>
        <div className="card card-flat"><p className="eyebrow">Players</p><h2>{stats.players}</h2></div>
        <div className="card card-flat"><p className="eyebrow">Teams</p><h2>{stats.teams}</h2></div>
        <div className="card card-flat"><p className="eyebrow">Live/Manual Matches</p><h2>{stats.matches}</h2></div>
        <div className="card card-flat"><p className="eyebrow">Simulated Matches</p><h2>{stats.simMatches}</h2></div>
      </div>

      <div className="section">
        <h2>Quick Actions</h2>
        <div className="card-grid">
          <Link to="/players" className="card">
            <h3>Player Database</h3>
            <p className="muted">Browse, add and manage player profiles and ratings.</p>
          </Link>
          <Link to="/teams" className="card">
            <h3>Teams</h3>
            <p className="muted">Create teams and manage squads.</p>
          </Link>
          {hasRole('admin', 'team_owner', 'tournament_organizer') && (
            <Link to="/auction" className="card">
              <h3>Auction Room</h3>
              <p className="muted">Run or join a live player auction.</p>
            </Link>
          )}
          <Link to="/matches" className="card">
            <h3>Matches</h3>
            <p className="muted">Create a match, run the toss, and score ball-by-ball.</p>
          </Link>
          <Link to="/simulation" className="card">
            <h3>Simulation &amp; Analytics</h3>
            <p className="muted">Simulate a virtual match and explore phase-wise analytics.</p>
          </Link>
          <Link to="/profile" className="card">
            <h3>Your Profile</h3>
            <p className="muted">Update your details and preferences.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
