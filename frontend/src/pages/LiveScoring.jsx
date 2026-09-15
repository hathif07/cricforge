import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RUN_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'caughtAndBowled'];

const LiveScoring = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [xiA, setXiA] = useState([]);
  const [xiB, setXiB] = useState([]);
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [extraType, setExtraType] = useState('none');
  const [showWicketForm, setShowWicketForm] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data } = await api.get(`/matches/${id}`);
    setMatch(data.data.match);
    const inningsList = data.data.match.innings;
    const current = inningsList[inningsList.length - 1];
    setInnings(current);
    if (current) {
      if (current.currentStriker) setStrikerId(current.currentStriker);
      if (current.currentNonStriker) setNonStrikerId(current.currentNonStriker);
      if (current.currentBowler) setBowlerId(current.currentBowler);
    }

    const [teamAXi, teamBXi] = await Promise.all([
      api.get(`/teams/${data.data.match.teamA.id}`),
      api.get(`/teams/${data.data.match.teamB.id}`)
    ]);
    setXiA(teamAXi.data.data.team.players || []);
    setXiB(teamBXi.data.data.team.players || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const battingSquad = innings && match ? (innings.battingTeamId === match.teamA.id ? xiA : xiB) : [];
  const bowlingSquad = innings && match ? (innings.battingTeamId === match.teamA.id ? xiB : xiA) : [];

  const findName = (list, pid) => list.find((p) => p._id === pid)?.name || '';

  const setBattersOnServer = async (payload) => {
    await api.post(`/matches/innings/${innings._id}/batters`, payload);
  };

  const recordBall = async (runs, isWicket = false) => {
    setError(''); setMessage('');
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Please select striker, non-striker and bowler before scoring.');
      return;
    }
    try {
      const payload = {
        strikerName: findName(battingSquad, strikerId),
        nonStrikerName: findName(battingSquad, nonStrikerId),
        bowlerId,
        bowlerName: findName(bowlingSquad, bowlerId),
        runsOffBat: extraType === 'wide' || extraType === 'noBall' ? 0 : runs,
        extras: { type: extraType, runs: extraType === 'bye' || extraType === 'legBye' ? runs : 0 },
        isWicket
      };
      if (isWicket) {
        payload.wicket = { type: wicketType, dismissedPlayerId: dismissedPlayerId || strikerId, dismissedPlayerName: findName(battingSquad, dismissedPlayerId || strikerId) };
      }

      await api.post(`/scoring/${id}/innings/${innings._id}/deliveries`, payload);
      setExtraType('none');
      setShowWicketForm(false);
      await load();
      setMessage('Delivery recorded.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record delivery.');
    }
  };

  const undo = async () => {
    try {
      await api.delete(`/scoring/${id}/innings/${innings._id}/deliveries/last`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not undo.');
    }
  };

  const startSecondInnings = async () => {
    try {
      await api.post(`/matches/${id}/start-second-innings`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start second innings.');
    }
  };

  if (!match || !innings) return <div className="spinner" />;

  return (
    <div>
      <div className="section-header">
        <h1>Live Scoring</h1>
        <button className="btn" onClick={() => navigate(`/matches/${id}/live`)}>View Spectator Screen</button>
      </div>

      <div className="scorebox card card-flat" style={{ marginBottom: 18 }}>
        <span className="runs">{innings.totalRuns}/{innings.totalWickets}</span>
        <span className="overs">({Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} ov)</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {innings.isComplete ? (
        <div className="alert alert-info">
          This innings is complete.{' '}
          {match.innings.length < 2 && <button className="btn btn-primary btn-sm" onClick={startSecondInnings}>Start Second Innings</button>}
          {match.innings.length >= 2 && <span> Match complete — view the <a href={`/matches/${id}/scorecard`}>full scorecard</a>.</span>}
        </div>
      ) : (
        <>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Striker</label>
              <select className="form-select" value={strikerId} onChange={(e) => { setStrikerId(e.target.value); setBattersOnServer({ strikerId: e.target.value }); }}>
                <option value="">Select…</option>
                {battingSquad.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Non-Striker</label>
              <select className="form-select" value={nonStrikerId} onChange={(e) => { setNonStrikerId(e.target.value); setBattersOnServer({ nonStrikerId: e.target.value }); }}>
                <option value="">Select…</option>
                {battingSquad.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bowler</label>
              <select className="form-select" value={bowlerId} onChange={(e) => setBowlerId(e.target.value)}>
                <option value="">Select…</option>
                {bowlingSquad.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pill-nav">
            {['none', 'wide', 'noBall', 'bye', 'legBye'].map((t) => (
              <span key={t} className={`pill ${extraType === t ? 'active' : ''}`} onClick={() => setExtraType(t)}>{t}</span>
            ))}
          </div>

          <div className="keyboard-grid" style={{ margin: '16px 0' }}>
            {RUN_OPTIONS.map((r) => (
              <button key={r} className="keyboard-btn" onClick={() => recordBall(r)}>{r}</button>
            ))}
            <button className="keyboard-btn" onClick={() => setShowWicketForm(!showWicketForm)}>WICKET</button>
          </div>

          {showWicketForm && (
            <div className="card">
              <h3>Record Wicket</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dismissal Type</label>
                  <select className="form-select" value={wicketType} onChange={(e) => setWicketType(e.target.value)}>
                    {WICKET_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dismissed Player</label>
                  <select className="form-select" value={dismissedPlayerId} onChange={(e) => setDismissedPlayerId(e.target.value)}>
                    <option value="">Striker ({findName(battingSquad, strikerId)})</option>
                    <option value={nonStrikerId}>Non-Striker ({findName(battingSquad, nonStrikerId)})</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-danger" onClick={() => recordBall(0, true)}>Confirm Wicket</button>
            </div>
          )}

          <button className="btn" style={{ marginTop: 20 }} onClick={undo}>Undo Last Delivery</button>
        </>
      )}
    </div>
  );
};

export default LiveScoring;
