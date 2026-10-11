import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RUN_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'caughtAndBowled'];
const EXTRA_OPTIONS = [
  { value: 'none', label: 'Normal' },
  { value: 'wide', label: 'Wide +1' },
  { value: 'noBall', label: 'No ball +1' },
  { value: 'bye', label: 'Bye' },
  { value: 'legBye', label: 'Leg bye' }
];

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
  const [pendingRuns, setPendingRuns] = useState(null);
  const [extraType, setExtraType] = useState('none');
  const [freeHit, setFreeHit] = useState(false);
  const [showWicketForm, setShowWicketForm] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [dismissedIds, setDismissedIds] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [activeScorecardTab, setActiveScorecardTab] = useState('batting');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [redoDelivery, setRedoDelivery] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/matches/${id}`);
    const currentMatch = data.data.match;
    const inningsList = Array.isArray(currentMatch.innings) ? currentMatch.innings : [];
    const current = inningsList[inningsList.length - 1];
    setMatch(currentMatch);
    setInnings(current);
    if (!current) {
      throw new Error('This match has no active innings. Return to Playing XI and start the match again.');
    }
    if (current) {
      setStrikerId(current.currentStriker || '');
      setNonStrikerId(current.currentNonStriker || '');
      setBowlerId(current.currentBowler || '');
    }

    const [teamAXi, teamBXi, scorecardResponse] = await Promise.all([
      api.get(`/teams/${currentMatch.teamA.id}`),
      api.get(`/teams/${currentMatch.teamB.id}`),
      api.get(`/matches/${id}/scorecard`)
    ]);
    setXiA(teamAXi.data.data.team.players || []);
    setXiB(teamBXi.data.data.team.players || []);
    const currentCard = scorecardResponse.data.data.innings?.find((entry) => entry.inningsNumber === current?.inningsNumber);
    setScorecard(currentCard || null);

    if (currentCard?.simulationProgression?.length > 0) {
      const lastSim = currentCard.simulationProgression[currentCard.simulationProgression.length - 1];
      setSimulation({
        projectedScore: lastSim.projectedScore,
        currentRunRate: lastSim.currentRunRate,
        requiredRunRate: lastSim.requiredRunRate,
        phase: lastSim.phase,
        situation: lastSim.situation,
        winProbability: {
          teamA: { percent: lastSim.teamAWinProb },
          teamB: { percent: lastSim.teamBWinProb }
        }
      });
    }

    const dismissedFromBattingCard = (currentCard?.battingCard || []).filter((player) => player.isOut).map((player) => player.playerId);
    const dismissedFromFallOfWickets = (currentCard?.fallOfWickets || []).map((wicket) => wicket.dismissedPlayerId);
    const dismissed = [...new Set([...dismissedFromBattingCard, ...dismissedFromFallOfWickets])];
    setDismissedIds(dismissed);
    if (dismissed.includes(current?.currentStriker)) setStrikerId('');
    if (dismissed.includes(current?.currentNonStriker)) setNonStrikerId('');
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || err.message || 'Could not load the scoring screen.'));
    // eslint-disable-next-line
  }, [id]);

  const battingSquad = useMemo(
    () => innings && match ? (innings.battingTeamId === match.teamA.id ? xiA : xiB) : [],
    [innings, match, xiA, xiB]
  );
  const bowlingSquad = useMemo(
    () => innings && match ? (innings.battingTeamId === match.teamA.id ? xiB : xiA) : [],
    [innings, match, xiA, xiB]
  );
  const availableBatters = battingSquad.filter((player) => !dismissedIds.includes(player._id));
  const selectedBowler = bowlingSquad.find((player) => player._id === bowlerId);
  const selectedExtra = EXTRA_OPTIONS.find((option) => option.value === extraType);
  const legalBalls = innings?.totalBalls || 0;
  const ballsInOver = legalBalls % 6;
  const oversFinished = Math.floor(legalBalls / 6);
  const oversRemaining = innings?.maxOvers ? Math.max(innings.maxOvers - oversFinished - (ballsInOver ? 1 : 0), 0) : null;
  const maxOversPerBowler = match?.format === 'T20' ? 4 : match?.format === 'ODI' ? 10 : match?.format === 'Custom' ? Math.ceil((match.oversPerInnings || 0) / 5) : null;
  const bowlingStats = scorecard?.bowlingCard || [];

  const findName = (list, pid) => list.find((p) => p._id === pid)?.name || '';

  const setBattersOnServer = async (payload) => {
    try {
      await api.post(`/matches/innings/${innings._id}/batters`, payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the batting pair.');
    }
  };

  const chooseStriker = (value) => {
    if (value === nonStrikerId) {
      setError('Striker and non-striker must be different players.');
      return;
    }
    setStrikerId(value);
    setBattersOnServer({ strikerId: value });
  };

  const chooseNonStriker = (value) => {
    if (value === strikerId) {
      setError('Striker and non-striker must be different players.');
      return;
    }
    setNonStrikerId(value);
    setBattersOnServer({ nonStrikerId: value });
  };

  const chooseExtra = (value) => {
    setExtraType(value);
    setPendingRuns(value === 'wide' || value === 'noBall' ? 0 : null);
    setShowWicketForm(false);
    if (value === 'wide' && wicketType !== 'runOut') setWicketType('runOut');
    if (value === 'noBall' && !['runOut', 'stumped'].includes(wicketType)) setWicketType('runOut');
  };

  const recordBall = async () => {
    setError('');
    setMessage('');
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Select a striker, non-striker and bowler before recording the next ball.');
      return;
    }
    if (pendingRuns === null) {
      setError('Choose the result of this delivery first.');
      return;
    }
    setSaving(true);
    try {
      const isWicket = showWicketForm;
      const payload = {
        strikerName: findName(battingSquad, strikerId),
        nonStrikerName: findName(battingSquad, nonStrikerId),
        bowlerId,
        bowlerName: findName(bowlingSquad, bowlerId),
        runsOffBat: ['wide', 'bye', 'legBye'].includes(extraType) ? 0 : pendingRuns,
        extras: { type: extraType, runs: extraType === 'bye' || extraType === 'legBye' ? pendingRuns : 0 },
        isWicket
      };
      if (isWicket) {
        const dismissedId = dismissedPlayerId || strikerId;
        payload.wicket = {
          type: wicketType,
          dismissedPlayerId: dismissedId,
          dismissedPlayerName: findName(battingSquad, dismissedId)
        };
      }

      const res = await api.post(`/scoring/${id}/innings/${innings._id}/deliveries`, payload);
      if (res.data?.data?.simulation) {
        setSimulation(res.data.data.simulation);
      }
      setRedoDelivery(null);
      if (isWicket) setDismissedIds((prev) => [...new Set([...prev, dismissedPlayerId || strikerId])]);
      setPendingRuns(null);
      setExtraType('none');
      setShowWicketForm(false);
      setDismissedPlayerId('');
      if (extraType === 'noBall') setFreeHit(true);
      else setFreeHit(false);
      await load();
      setMessage(extraType === 'wide' ? 'Wide recorded — an extra legal ball is required.' : 'Next ball recorded.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record delivery.');
    } finally {
      setSaving(false);
    }
  };

  const undo = async () => {
    setError('');
    try {
      const { data } = await api.delete(`/scoring/${id}/innings/${innings._id}/deliveries/last`);
      setRedoDelivery(data.data.redoDelivery || null);
      setPendingRuns(null);
      setExtraType('none');
      setFreeHit(false);
      await load();
      setMessage('Last delivery undone.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not undo.');
    }
  };

  const redo = async () => {
    if (!redoDelivery) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = {
        strikerName: redoDelivery.strikerName,
        nonStrikerName: redoDelivery.nonStrikerName,
        bowlerId: redoDelivery.bowlerId,
        bowlerName: redoDelivery.bowlerName,
        runsOffBat: redoDelivery.runsOffBat,
        extras: redoDelivery.extras,
        isWicket: redoDelivery.isWicket,
        wicket: redoDelivery.wicket
      };
      await api.post(`/scoring/${id}/innings/${innings._id}/deliveries`, payload);
      setRedoDelivery(null);
      await load();
      setMessage('Delivery redone.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not redo delivery.');
    } finally {
      setSaving(false);
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

  if (!match || !innings) {
    return (
      <div>
        <div className="section-header"><h1>Live Scoring</h1></div>
        {error ? <div className="alert alert-error">{error}</div> : <div className="spinner" />}
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Live Scoring</h1>
        <button className="btn" onClick={() => navigate(`/matches/${id}/live`)}>View Spectator Screen</button>
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
        <div className="scoring-layout">
          <main>
            <div className="card live-scoreboard">
              <div className="card-title">
                <div>
                  <p className="eyebrow">{innings.battingTeamName} batting</p>
                  <h3>Live scoreboard</h3>
                </div>
                <span className="badge badge-outline">{innings.status === 'in_progress' ? 'LIVE' : innings.status}</span>
              </div>
              <div className="scoreboard-grid">
                <div className="scoreboard-score"><span className="eyebrow">Score</span><strong>{innings.totalRuns}/{innings.totalWickets}</strong><small>({Math.floor(legalBalls / 6)}.{legalBalls % 6} ov)</small></div>
                <div><span className="eyebrow">Overs finished</span><strong>{oversFinished}.{ballsInOver}</strong></div>
                <div><span className="eyebrow">Overs remaining</span><strong>{oversRemaining === null ? '—' : oversRemaining}</strong></div>
                <div><span className="eyebrow">Current over</span><strong>{ballsInOver}/6 legal balls</strong></div>
              </div>
              <div className="current-players">
                <span>Striker: <strong>{findName(battingSquad, strikerId) || 'Replacement required'}</strong></span>
                <span>Non-striker: <strong>{findName(battingSquad, nonStrikerId) || 'Replacement required'}</strong></span>
                <span>Bowler: <strong>{findName(bowlingSquad, bowlerId) || 'Select bowler'}</strong></span>
              </div>
            </div>

            {/* Live Simulation Engine Bar */}
            {simulation && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #10b981', background: 'var(--card-bg, #ffffff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span className="eyebrow" style={{ color: '#10b981', fontWeight: 700 }}>⚡ LIVE BALL SIMULATION</span>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>{simulation.situation || 'Match forecast'}</strong>
                  </div>
                  {simulation.phase && (
                    <span className="badge badge-outline" style={{ textTransform: 'uppercase' }}>
                      Phase: {simulation.phase}
                    </span>
                  )}
                </div>

                {/* Win Probability Bar */}
                {simulation.winProbability && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                      <span>{match.teamA?.name}: {simulation.winProbability.teamA?.percent ?? 50}%</span>
                      <span>{match.teamB?.name}: {simulation.winProbability.teamB?.percent ?? 50}%</span>
                    </div>
                    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#e2e8f0' }}>
                      <div style={{ width: `${simulation.winProbability.teamA?.percent ?? 50}%`, background: '#0284c7', transition: 'width 0.3s ease' }} />
                      <div style={{ width: `${simulation.winProbability.teamB?.percent ?? 50}%`, background: '#e11d48', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}

                <div className="grid-3" style={{ fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '6px 10px', borderRadius: 6 }}>
                    <span className="eyebrow">Projected</span>
                    <strong>{simulation.projectedScore ?? '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '6px 10px', borderRadius: 6 }}>
                    <span className="eyebrow">CRR</span>
                    <strong>{simulation.currentRunRate ?? (legalBalls > 0 ? ((innings.totalRuns / legalBalls) * 6).toFixed(2) : '0.00')}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '6px 10px', borderRadius: 6 }}>
                    <span className="eyebrow">RRR</span>
                    <strong>{simulation.requiredRunRate ?? '—'}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-title"><h3>Current delivery</h3>{(freeHit || extraType === 'noBall') && <span className="badge badge-solid">FREE HIT</span>}</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Striker</label>
                  <select className="form-select" value={strikerId} onChange={(e) => chooseStriker(e.target.value)}>
                    <option value="">Select…</option>
                    {availableBatters.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Non-striker</label>
                  <select className="form-select" value={nonStrikerId} onChange={(e) => chooseNonStriker(e.target.value)}>
                    <option value="">Select…</option>
                    {availableBatters.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <p className="form-label">Delivery type</p>
              <div className="pill-nav delivery-type-options">
                {EXTRA_OPTIONS.map((option) => (
                  <button type="button" key={option.value} className={`pill ${extraType === option.value ? 'active' : ''}`} onClick={() => chooseExtra(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
              {extraType === 'wide' && <p className="form-hint">Wide adds one run and does not consume a legal ball, so another ball is required.</p>}
              {extraType === 'noBall' && <p className="form-hint">No ball adds one run and activates free hit for the next delivery.</p>}

              <p className="form-label">Result to enter</p>
              <div className="keyboard-grid">
                {RUN_OPTIONS.map((run) => (
                  <button type="button" key={run} className={`keyboard-btn ${pendingRuns === run ? 'selected' : ''}`} onClick={() => setPendingRuns(run)}>{run}</button>
                ))}
                <button type="button" className={`keyboard-btn ${showWicketForm ? 'selected' : ''}`} onClick={() => { setShowWicketForm((visible) => !visible); setPendingRuns(0); }}>WICKET</button>
              </div>

              {showWicketForm && (
                <div className="card scoring-wicket-card">
                  <h3>Record wicket</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Dismissal type</label>
                      <select className="form-select" value={wicketType} onChange={(e) => setWicketType(e.target.value)}>
                        {WICKET_TYPES.filter((wicket) => extraType === 'wide' ? wicket === 'runOut' : extraType === 'noBall' ? ['runOut', 'stumped'].includes(wicket) : true).map((wicket) => <option key={wicket} value={wicket}>{wicket}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dismissed player</label>
                      <select className="form-select" value={dismissedPlayerId} onChange={(e) => setDismissedPlayerId(e.target.value)}>
                        <option value="">Striker ({findName(battingSquad, strikerId)})</option>
                        <option value={nonStrikerId}>Non-striker ({findName(battingSquad, nonStrikerId)})</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="next-ball-bar">
                <span className="muted">{selectedExtra.label}{pendingRuns !== null ? ` · ${pendingRuns} selected` : ' · choose a result'}</span>
                <button type="button" className="btn btn-primary next-ball-btn" disabled={saving} onClick={recordBall}>
                  {saving ? 'Saving…' : 'Next ball →'}
                </button>
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={undo} disabled={saving}>Undo last delivery</button>
                <button type="button" className="btn" onClick={redo} disabled={!redoDelivery || saving}>Redo delivery</button>
              </div>
            </div>

            {/* Live Scorecard for this Innings */}
            {scorecard && (
              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>📊 Live Innings Scorecard</h3>
                  <div className="pill-nav">
                    <button
                      type="button"
                      className={`pill-btn ${activeScorecardTab === 'batting' ? 'active' : ''}`}
                      onClick={() => setActiveScorecardTab('batting')}
                    >
                      Batting
                    </button>
                    <button
                      type="button"
                      className={`pill-btn ${activeScorecardTab === 'bowling' ? 'active' : ''}`}
                      onClick={() => setActiveScorecardTab('bowling')}
                    >
                      Bowling
                    </button>
                  </div>
                </div>

                {activeScorecardTab === 'batting' && (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Batter</th>
                          <th>Runs</th>
                          <th>Balls</th>
                          <th>4s</th>
                          <th>6s</th>
                          <th>SR</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(scorecard.battingCard || []).map((b) => {
                          const isStriker = b.playerId === strikerId;
                          const isNonStriker = b.playerId === nonStrikerId;
                          return (
                            <tr key={b.playerId} style={isStriker ? { background: 'rgba(2, 132, 199, 0.08)' } : isNonStriker ? { background: 'rgba(16, 185, 129, 0.08)' } : undefined}>
                              <td>
                                <strong>{b.name}</strong>
                                {isStriker && <span className="badge badge-solid" style={{ marginLeft: 6, fontSize: '0.7rem' }}>⚡ Striker</span>}
                                {isNonStriker && <span className="badge badge-outline" style={{ marginLeft: 6, fontSize: '0.7rem' }}>🏃 Non-striker</span>}
                              </td>
                              <td><strong>{b.runs}</strong></td>
                              <td>{b.balls}</td>
                              <td>{b.fours}</td>
                              <td>{b.sixes}</td>
                              <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                              <td>{b.isOut ? <span className="muted">{b.dismissal}</span> : <strong style={{ color: '#16a34a' }}>not out</strong>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeScorecardTab === 'bowling' && (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bowler</th>
                          <th>Overs</th>
                          <th>Maidens</th>
                          <th>Runs</th>
                          <th>Wkts</th>
                          <th>Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(scorecard.bowlingCard || []).map((b) => {
                          const isCurrentBowler = b.playerId === bowlerId;
                          return (
                            <tr key={b.playerId} style={isCurrentBowler ? { background: 'rgba(139, 92, 246, 0.08)' } : undefined}>
                              <td>
                                <strong>{b.name}</strong>
                                {isCurrentBowler && <span className="badge badge-solid" style={{ marginLeft: 6, fontSize: '0.7rem' }}>🎯 Current</span>}
                              </td>
                              <td>{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                              <td>{b.maidens || 0}</td>
                              <td>{b.runs}</td>
                              <td><strong>{b.wickets}</strong></td>
                              <td>{b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '0.00'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {scorecard.fallOfWickets && scorecard.fallOfWickets.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--gray-200, #e2e8f0)', fontSize: '0.88rem' }}>
                    <strong>Fall of Wickets: </strong>
                    <span className="muted">
                      {scorecard.fallOfWickets.map((w) => `${w.score}-${w.wicketNumber} (${w.dismissedPlayerName}, ${w.overs} ov)`).join(' • ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </main>

          <aside className="scoring-catalog card">
            <div className="card-title"><h3>Match catalog</h3><span className="badge badge-outline">{bowlingSquad.length} bowlers</span></div>
            <label className="form-label">Bowler for this over</label>
            <select className="form-select" value={bowlerId} onChange={(e) => setBowlerId(e.target.value)}>
              <option value="">Select bowler…</option>
              {bowlingSquad.map((player) => (
                <option key={player._id} value={player._id}>{player.name} · {player.bowlingStyle || 'Style not specified'}</option>
              ))}
            </select>
            {selectedBowler && <div className="catalog-highlight"><strong>{selectedBowler.name}</strong><span>{selectedBowler.role} · {selectedBowler.bowlingStyle || 'Style not specified'}</span></div>}
            <hr className="divider" />
            <p className="form-label">Available batters</p>
            <div className="catalog-list">
              {availableBatters.map((player) => (
                <button type="button" className={`catalog-player ${player._id === strikerId ? 'active' : ''}`} key={player._id} onClick={() => chooseStriker(player._id)}>
                  <span>{player.name}</span><small>{player.role}{player.battingStyle ? ` · ${player.battingStyle}` : ''}</small>
                </button>
              ))}
            </div>
            <hr className="divider" />
            <p className="form-label">Bowling figures</p>
            <div className="catalog-list">
              {bowlingSquad.filter((player) => player.role === 'Bowler' || player.role === 'All-rounder').map((player) => {
                const stats = bowlingStats.find((entry) => entry.playerId === player._id);
                const balls = stats?.balls || 0;
                const bowledOvers = `${Math.floor(balls / 6)}.${balls % 6}`;
                const remaining = maxOversPerBowler === null ? '—' : Math.max(maxOversPerBowler - Math.floor(balls / 6), 0);
                return (
                  <div className="bowler-stat" key={player._id}>
                    <span><strong>{player.name}</strong><small>{player.bowlingStyle || 'Style not specified'}</small></span>
                    <span><strong>{bowledOvers}</strong><small>{remaining} ov left</small></span>
                  </div>
                );
              })}
            </div>
            <p className="form-hint">Select a replacement here after a wicket. Captain and wicketkeeper details are shown in the team catalog.</p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default LiveScoring;
