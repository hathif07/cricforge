import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const TeamXIPanel = ({ team, matchId, onSaved, saved }) => {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState({});
  const [captainId, setCaptainId] = useState('');
  const [keeperId, setKeeperId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/teams/${team.id}`).then(async ({ data }) => {
      const loadedTeam = data.data.team;
      const loadedPlayers = loadedTeam.players || [];
      setPlayers(loadedPlayers);

      if (loadedPlayers.length >= 11) {
        const startingPlayers = loadedPlayers.slice(0, 11);
        const captainId = loadedTeam.captain?._id || startingPlayers.find((player) => player.role === 'Batter')?._id || startingPlayers[0]._id;
        const keeperId = startingPlayers.find((player) => player.role === 'Wicketkeeper')?._id || startingPlayers[0]._id;
        const selectedState = Object.fromEntries(startingPlayers.map((player) => [player._id, true]));
        setSelected(selectedState);
        setCaptainId(captainId);
        setKeeperId(keeperId);

        try {
          await api.post(`/matches/${matchId}/playing-xi`, {
            teamId: team.id,
            players: startingPlayers.map((player, index) => ({
              playerId: player._id,
              playerName: player.name,
              playerRole: player.role.toLowerCase(),
              isCaptain: player._id === captainId,
              isWicketkeeper: player._id === keeperId,
              battingOrder: index + 1
            }))
          });
          onSaved();
        } catch (err) {
          setError(err.response?.data?.message || 'Could not preload the Playing XI.');
        }
      }
    });
  }, [team.id, matchId]); // preload once for this team in this match

  const toggle = (playerId) => {
    setSelected((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const save = async () => {
    setError('');
    if (selectedIds.length !== 11) {
      setError(`Select exactly 11 players (currently ${selectedIds.length}).`);
      return;
    }
    if (!captainId || !keeperId) {
      setError('Please designate a captain and a wicketkeeper.');
      return;
    }
    const xiPlayers = selectedIds.map((pid) => {
      const p = players.find((pl) => pl._id === pid);
      return {
        playerId: pid,
        playerName: p.name,
        playerRole: p.role.toLowerCase(),
        isCaptain: pid === captainId,
        isWicketkeeper: pid === keeperId
      };
    });
    try {
      await api.post(`/matches/${matchId}/playing-xi`, { teamId: team.id, players: xiPlayers });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save Playing XI.');
    }
  };

  return (
    <div className="card">
      <h3>{team.name} {saved && <span className="badge badge-solid">XI Loaded</span>}</h3>
      <p className="muted">The first 11 players, captain and wicketkeeper are preloaded. You can edit them before starting.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap" style={{ marginBottom: 12 }}>
        <table className="data-table">
          <thead><tr><th>In XI</th><th>Player</th><th>Role</th><th>Captain</th><th>Keeper</th></tr></thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td><input type="checkbox" checked={!!selected[p._id]} onChange={() => toggle(p._id)} /></td>
                <td>{p.name}</td>
                <td>{p.role}</td>
                <td><input type="radio" name={`captain-${team.id}`} checked={captainId === p._id} onChange={() => setCaptainId(p._id)} /></td>
                <td><input type="radio" name={`keeper-${team.id}`} checked={keeperId === p._id} onChange={() => setKeeperId(p._id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {players.length === 0 && <div className="empty-state">This team has no players in its squad yet.</div>}
      </div>
      <p className="muted">Selected: {selectedIds.length} / 11</p>
      <button className="btn btn-primary" onClick={save}>Save {team.name} XI</button>
    </div>
  );
};

const PlayingXI = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [savedA, setSavedA] = useState(false);
  const [savedB, setSavedB] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/matches/${id}`).then(({ data }) => setMatch(data.data.match));
  }, [id]);

  const startMatch = async () => {
    setError('');
    try {
      await api.post(`/matches/${id}/start`);
      navigate(`/matches/${id}/live-scoring`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start match.');
    }
  };

  if (!match) return <div className="spinner" />;

  return (
    <div>
      <div className="section-header"><h1>Playing XI</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="grid-2">
        <TeamXIPanel team={match.teamA} matchId={id} onSaved={() => setSavedA(true)} saved={savedA} />
        <TeamXIPanel team={match.teamB} matchId={id} onSaved={() => setSavedB(true)} saved={savedB} />
      </div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!savedA || !savedB} onClick={startMatch}>
        Start Match
      </button>
    </div>
  );
};

export default PlayingXI;
