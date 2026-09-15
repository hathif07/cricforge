import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const TeamDetail = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api.get(`/teams/${id}`).then(({ data }) => setTeam(data.data.team));
  }, [id]);

  if (!team) return <div className="spinner" />;

  return (
    <div>
      <p><Link to="/teams">&larr; All Teams</Link></p>
      <div className="section-header">
        <h1>{team.teamName} <span className="muted">({team.shortName})</span></h1>
      </div>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card card-flat">
          <p className="eyebrow">Purse Remaining</p>
          <h2>{team.purseRemaining} / {team.purseTotal} Cr</h2>
        </div>
        <div className="card card-flat">
          <p className="eyebrow">Squad Size</p>
          <h2>{team.players?.length || 0}</h2>
        </div>
      </div>

      <h3>Squad</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>Bat Rtg</th><th>Bowl Rtg</th></tr></thead>
          <tbody>
            {(team.players || []).map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td><td>{p.role}</td><td>{p.battingRating}</td><td>{p.bowlingRating}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!team.players || team.players.length === 0) && <div className="empty-state">No players in this squad yet.</div>}
      </div>
    </div>
  );
};

export default TeamDetail;
