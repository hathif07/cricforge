import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Computes live scorecard and simulation analysis state at any ball in an innings.
 */
const computeScoreboardAtBall = (inningsDeliveries, ballIndex, totalOversLimit = 20, target = null) => {
  if (!inningsDeliveries || inningsDeliveries.length === 0) {
    return null;
  }
  const safeIndex = Math.min(Math.max(ballIndex, 0), inningsDeliveries.length - 1);
  const delivs = inningsDeliveries.slice(0, safeIndex + 1);

  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;
  const extras = { wide: 0, no_ball: 0, bye: 0, leg_bye: 0 };
  const battersMap = {};
  const bowlersMap = {};
  const fow = [];

  const getBatter = (p) => {
    const id = p?._id || p || 'unknown';
    if (!battersMap[id]) {
      battersMap[id] = {
        id,
        name: p?.name || 'Batter',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissal: 'not out'
      };
    }
    return battersMap[id];
  };

  const getBowler = (p) => {
    const id = p?._id || p || 'unknown';
    if (!bowlersMap[id]) {
      bowlersMap[id] = {
        id,
        name: p?.name || 'Bowler',
        balls: 0,
        runs: 0,
        maidens: 0,
        wickets: 0
      };
    }
    return bowlersMap[id];
  };

  for (let i = 0; i < delivs.length; i++) {
    const d = delivs[i];
    const isLegal = !['wide', 'no_ball'].includes(d.extraType);
    if (isLegal) legalBalls++;

    totalRuns += d.totalRuns || 0;

    if (d.extraType) {
      extras[d.extraType] = (extras[d.extraType] || 0) + (d.extraRuns || 1);
    }

    const striker = getBatter(d.strikerId);
    if (d.nonStrikerId) getBatter(d.nonStrikerId);

    if (d.runsBat > 0) striker.runs += d.runsBat;
    if (!d.extraType || ['bye', 'leg_bye'].includes(d.extraType)) striker.balls++;
    if (d.runsBat === 4) striker.fours++;
    if (d.runsBat === 6) striker.sixes++;

    const bowler = getBowler(d.bowlerId);
    if (isLegal) bowler.balls++;
    bowler.runs += d.totalRuns || 0;

    if (d.isWicket) {
      wickets++;
      const dismissedPlayer = d.dismissedPlayerId ? getBatter(d.dismissedPlayerId) : striker;
      dismissedPlayer.isOut = true;
      dismissedPlayer.dismissal = d.wicketType ? `${d.wicketType} b. ${d.bowlerId?.name || 'Bowler'}` : 'out';
      if (d.wicketType !== 'run_out') {
        bowler.wickets++;
      }
      fow.push({
        score: totalRuns,
        wicketNumber: wickets,
        name: dismissedPlayer.name,
        overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
      });
    }
  }

  // Bowler economy & overs
  Object.values(bowlersMap).forEach((b) => {
    b.overs = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
    b.economy = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '0.00';
  });

  // Batter strike rate
  Object.values(battersMap).forEach((b) => {
    b.strikeRate = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
  });

  const oversString = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const oversCompleted = Math.floor(legalBalls / 6);
  const crr = legalBalls > 0 ? Number(((totalRuns / legalBalls) * 6).toFixed(2)) : 0;
  const ballsRemaining = Math.max(totalOversLimit * 6 - legalBalls, 0);

  let rrr = null;
  let runsNeeded = null;
  if (target != null) {
    runsNeeded = Math.max(target - totalRuns, 0);
    rrr = ballsRemaining > 0 ? Number(((runsNeeded / ballsRemaining) * 6).toFixed(2)) : (runsNeeded > 0 ? 99.99 : 0);
  }

  // Phase
  const ppOvers = Math.round(totalOversLimit * 0.3);
  const deathOvers = Math.round(totalOversLimit * 0.8);
  const phase = oversCompleted < ppOvers ? 'powerplay' : oversCompleted >= deathOvers ? 'death' : 'middle';

  // Projected score
  const wicketsInHand = Math.max(10 - wickets, 0);
  const resourceMultiplier = 0.35 + (0.65 * (wicketsInHand / 10));
  let projectedScore = Math.round(totalRuns + ((ballsRemaining / 6) * Math.max(crr, 7.5) * resourceMultiplier));
  if (target != null && projectedScore > target && runsNeeded > 0) projectedScore = target;

  // Win probability
  let battingWinProb = 50;
  if (target == null) {
    const par = totalOversLimit * 8;
    const adv = (projectedScore - par) / (par * 0.35 || 1);
    const pen = (wickets / 10) * 25;
    battingWinProb = Math.min(Math.max(Math.round(50 + adv * 30 - pen), 5), 95);
  } else {
    if (runsNeeded <= 0) battingWinProb = 100;
    else if (wicketsInHand <= 0 || (ballsRemaining <= 0 && runsNeeded > 0)) battingWinProb = 0;
    else {
      const crrDiff = crr - (rrr || 0);
      const wktEdge = (wicketsInHand - 5) * 5;
      const prob = 50 + crrDiff * 6 + wktEdge;
      battingWinProb = Math.min(Math.max(Math.round(prob), 1), 99);
    }
  }

  return {
    totalRuns,
    wickets,
    legalBalls,
    oversString,
    phase,
    crr,
    rrr,
    runsNeeded,
    projectedScore,
    battingWinProb,
    bowlingWinProb: 100 - battingWinProb,
    batters: Object.values(battersMap),
    bowlers: Object.values(bowlersMap),
    fow,
    extras,
    activeDelivery: delivs[delivs.length - 1] || null
  };
};

const Simulation = () => {
  const { hasRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ teamAId: '', teamBId: '', oversLimit: 20 });
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeInningsNum, setActiveInningsNum] = useState(1);
  const [activeTab, setActiveTab] = useState('ball_simulation'); // 'ball_simulation' | 'full_scoreboard' | 'analytics' | 'ball_feed'
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);

  // Ball-by-ball playback state
  const [ballIndex, setBallIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1 = normal, 2 = fast, 5 = ultra
  const playTimerRef = useRef(null);

  const loadTeams = async () => {
    try {
      const { data } = await api.get('/teams');
      setTeams(data.data.teams || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMatches = async () => {
    try {
      const { data } = await api.get('/module5/matches');
      setMatches(data.data.matches || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTeams();
    loadMatches();
  }, []);

  const runSimulation = async (e) => {
    e.preventDefault();
    setError('');
    if (form.teamAId === form.teamBId) {
      setError('Please select two different teams.');
      return;
    }
    setSimulating(true);
    try {
      const { data } = await api.post('/module5/simulate', form);
      await loadMatches();
      await viewMatch(data.data.match._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const viewMatch = async (matchId) => {
    setError('');
    setIsPlaying(false);
    try {
      const [mRes, sRes, dRes, aRes] = await Promise.all([
        api.get(`/module5/matches/${matchId}`),
        api.get(`/module5/matches/${matchId}/statistics`).catch(() => ({ data: { data: { stats: [] } } })),
        api.get(`/module5/matches/${matchId}/deliveries`).catch(() => ({ data: { data: { deliveries: [] } } })),
        api.get(`/module5/matches/${matchId}/analytics`, { params: { innings: 1 } }).catch(() => ({ data: { data: null } }))
      ]);

      const m = mRes.data.data.match;
      setSelected(m);
      setStatistics(sRes.data.data.stats || []);
      const allDelivs = dRes.data.data.deliveries || [];
      setDeliveries(allDelivs);
      setAnalytics(aRes.data.data);
      setActiveInningsNum(1);

      // Default ball slider to first ball of innings 1
      setBallIndex(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load simulated match details.');
    }
  };

  // Filter deliveries by currently active innings tab
  const inningsDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.inningsNumber === activeInningsNum);
  }, [deliveries, activeInningsNum]);

  // Target for 2nd innings
  const inningsTarget = useMemo(() => {
    if (activeInningsNum === 2 && selected?.innings?.[0]) {
      return (selected.innings[0].totalRuns || 0) + 1;
    }
    return null;
  }, [activeInningsNum, selected]);

  // Live scoreboard computed at current slider ball
  const liveBallState = useMemo(() => {
    if (!inningsDeliveries.length) return null;
    return computeScoreboardAtBall(
      inningsDeliveries,
      ballIndex,
      selected?.oversLimit || 20,
      inningsTarget
    );
  }, [inningsDeliveries, ballIndex, selected, inningsTarget]);

  // Innings switch handler
  const handleInningsChange = async (innNum) => {
    setActiveInningsNum(innNum);
    setIsPlaying(false);
    setBallIndex(0);
    if (selected) {
      try {
        const { data: aData } = await api.get(`/module5/matches/${selected._id}/analytics`, { params: { innings: innNum } });
        setAnalytics(aData.data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.round(1000 / playbackSpeed);
      playTimerRef.current = setInterval(() => {
        setBallIndex((prev) => {
          if (prev >= inningsDeliveries.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, inningsDeliveries.length]);

  const stepNext = () => {
    setBallIndex((prev) => Math.min(prev + 1, inningsDeliveries.length - 1));
  };
  const stepPrev = () => {
    setBallIndex((prev) => Math.max(prev - 1, 0));
  };
  const stepFirst = () => {
    setBallIndex(0);
  };
  const stepLast = () => {
    setBallIndex(inningsDeliveries.length - 1);
  };

  // Determine Batting Team and Bowling Team names for active innings
  const activeBattingTeamName = useMemo(() => {
    if (!selected) return 'Batting Team';
    const inn = selected.innings?.find((i) => i.inningsNumber === activeInningsNum);
    if (inn?.battingTeamId?.teamName) return inn.battingTeamId.teamName;
    if (inn?.battingTeamId) {
      if (String(inn.battingTeamId) === String(selected.teamA?._id || selected.teamA?.id)) return selected.teamA.teamName;
      if (String(inn.battingTeamId) === String(selected.teamB?._id || selected.teamB?.id)) return selected.teamB.teamName;
    }
    return activeInningsNum === 1 ? selected.teamA?.teamName : selected.teamB?.teamName;
  }, [selected, activeInningsNum]);

  const activeBowlingTeamName = useMemo(() => {
    if (!selected) return 'Bowling Team';
    const inn = selected.innings?.find((i) => i.inningsNumber === activeInningsNum);
    if (inn?.bowlingTeamId?.teamName) return inn.bowlingTeamId.teamName;
    if (inn?.bowlingTeamId) {
      if (String(inn.bowlingTeamId) === String(selected.teamA?._id || selected.teamA?.id)) return selected.teamA.teamName;
      if (String(inn.bowlingTeamId) === String(selected.teamB?._id || selected.teamB?.id)) return selected.teamB.teamName;
    }
    return activeInningsNum === 1 ? selected.teamB?.teamName : selected.teamA?.teamName;
  }, [selected, activeInningsNum]);

  // Full final scorecard from precomputed statistics
  const fullBattersForInnings = useMemo(() => {
    if (!statistics || !selected) return [];
    const inn = selected.innings?.find((i) => i.inningsNumber === activeInningsNum);
    const battingTeamId = inn?.battingTeamId?._id || inn?.battingTeamId;
    return statistics.filter((s) => {
      const tId = s.teamId?._id || s.teamId;
      return String(tId) === String(battingTeamId);
    });
  }, [statistics, selected, activeInningsNum]);

  const fullBowlersForInnings = useMemo(() => {
    if (!statistics || !selected) return [];
    const inn = selected.innings?.find((i) => i.inningsNumber === activeInningsNum);
    const bowlingTeamId = inn?.bowlingTeamId?._id || inn?.bowlingTeamId;
    return statistics.filter((s) => {
      const tId = s.teamId?._id || s.teamId;
      return String(tId) === String(bowlingTeamId) && s.bowling?.ballsBowled > 0;
    });
  }, [statistics, selected, activeInningsNum]);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Match Simulation &amp; Live Ball Engine</h1>
          <p className="muted">
            Simulate realistic matches with ratings-driven ball outcomes, live win probabilities, and dynamic ball-by-ball scoreboards.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Simulation Trigger Form */}
      {hasRole('admin', 'team_owner', 'tournament_organizer') && (
        <div className="card" style={{ marginBottom: 24, borderTop: '4px solid #0284c7' }}>
          <h3>⚡ Configure &amp; Simulate Match</h3>
          <form onSubmit={runSimulation} className="form-row" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Team A</label>
              <select className="form-select" value={form.teamAId} onChange={(e) => setForm({ ...form, teamAId: e.target.value })} required>
                <option value="">Select Team A…</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName} ({t.shortName})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team B</label>
              <select className="form-select" value={form.teamBId} onChange={(e) => setForm({ ...form, teamBId: e.target.value })} required>
                <option value="">Select Team B…</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName} ({t.shortName})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label className="form-label">Overs</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={form.oversLimit}
                onChange={(e) => setForm({ ...form, oversLimit: Number(e.target.value) })}
              />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }} disabled={simulating}>
              {simulating ? 'Simulating…' : 'Run Simulation'}
            </button>
          </form>
        </div>
      )}

      <div className="grid-3" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Left Column: Simulated Matches Catalog */}
        <div>
          <h3>Simulated Matches</h3>
          <div className="card-grid" style={{ gridTemplateColumns: '1fr', marginTop: 12, maxHeight: '80vh', overflowY: 'auto' }}>
            {matches.map((m) => {
              const isSel = selected && selected._id === m._id;
              return (
                <div
                  key={m._id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderLeft: isSel ? '4px solid #0284c7' : '1px solid var(--border-color, #e2e8f0)',
                    background: isSel ? 'rgba(2, 132, 199, 0.05)' : undefined,
                    padding: '12px 16px'
                  }}
                  onClick={() => viewMatch(m._id)}
                >
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                    {m.teamA?.teamName} vs {m.teamB?.teamName}
                  </strong>
                  <span className="badge badge-outline" style={{ marginTop: 4 }}>{m.oversLimit} Overs</span>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6, marginBottom: 0 }}>
                    {m.resultMargin || m.status}
                  </p>
                </div>
              );
            })}
            {matches.length === 0 && <div className="empty-state">No simulated matches yet.</div>}
          </div>
        </div>

        {/* Right Column: Selected Match Simulation Player & Full Scoreboard */}
        <div>
          {selected && (
            <div>
              {/* Match Overview Banner */}
              <div className="card card-flat" style={{ marginBottom: 20, borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {selected.teamA?.teamName} vs {selected.teamB?.teamName}
                    </h2>
                    <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
                      {selected.oversLimit} Overs &middot; Toss: {selected.tossWinnerTeamId?.teamName || 'Toss winner'} elected to {selected.tossDecision || 'bat'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-solid" style={{ fontSize: '0.9rem' }}>COMPLETED</span>
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#16a34a' }}>
                      {selected.resultMargin}
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                  {selected.innings.map((inn) => (
                    <div key={inn.inningsNumber} style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '8px 12px', borderRadius: 6 }}>
                      <span className="eyebrow">Innings {inn.inningsNumber}</span>
                      <strong>{inn.totalRuns}/{inn.wickets}</strong> ({inn.overs} ov)
                    </div>
                  ))}
                </div>
              </div>

              {/* Innings Selector & Primary View Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                {/* Innings Tabs */}
                <div className="pill-nav">
                  {selected.innings.map((inn) => (
                    <button
                      key={inn.inningsNumber}
                      className={`pill-btn ${activeInningsNum === inn.inningsNumber ? 'active' : ''}`}
                      onClick={() => handleInningsChange(inn.inningsNumber)}
                    >
                      Innings {inn.inningsNumber} ({inn.totalRuns}/{inn.wickets})
                    </button>
                  ))}
                </div>

                {/* Primary Mode Tabs */}
                <div className="pill-nav">
                  <button
                    className={`pill-btn ${activeTab === 'ball_simulation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ball_simulation')}
                  >
                    ⚡ Ball Simulation
                  </button>
                  <button
                    className={`pill-btn ${activeTab === 'full_scoreboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('full_scoreboard')}
                  >
                    📊 Full Scoreboard
                  </button>
                  <button
                    className={`pill-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    📈 Analytics
                  </button>
                  <button
                    className={`pill-btn ${activeTab === 'ball_feed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ball_feed')}
                  >
                    📜 Ball Feed
                  </button>
                </div>
              </div>

              {/* TAB 1: BALL-BY-BALL SIMULATION ENGINE & DYNAMIC SCOREBOARD */}
              {activeTab === 'ball_simulation' && (
                <div>
                  {/* Playback Control Bar */}
                  <div className="card" style={{ marginBottom: 16, background: 'var(--card-bg, #ffffff)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" className="btn btn-sm" onClick={stepFirst} title="First Ball">|◀</button>
                        <button type="button" className="btn btn-sm" onClick={stepPrev} title="Previous Ball">◀</button>
                        <button
                          type="button"
                          className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => setIsPlaying(!isPlaying)}
                          style={{ minWidth: 80 }}
                        >
                          {isPlaying ? '⏸ Pause' : '▶ Play'}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={stepNext} title="Next Ball">▶</button>
                        <button type="button" className="btn btn-sm" onClick={stepLast} title="Last Ball">▶|</button>
                      </div>

                      {/* Speed control */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>Speed:</span>
                        {[1, 2, 5].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            className={`btn btn-sm ${playbackSpeed === spd ? 'btn-primary' : ''}`}
                            onClick={() => setPlaybackSpeed(spd)}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      {/* Ball counter indicator */}
                      <div>
                        <strong>Ball {inningsDeliveries.length > 0 ? ballIndex + 1 : 0}</strong>
                        <span className="muted"> of {inningsDeliveries.length}</span>
                      </div>
                    </div>

                    {/* Interactive Slider */}
                    <div style={{ marginTop: 14 }}>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, inningsDeliveries.length - 1)}
                        value={ballIndex}
                        onChange={(e) => {
                          setIsPlaying(false);
                          setBallIndex(Number(e.target.value));
                        }}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Active Delivery Highlight Banner */}
                  {liveBallState?.activeDelivery && (
                    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #8b5cf6', background: 'var(--bg-secondary, #f8fafc)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span className="badge badge-outline" style={{ fontWeight: 700 }}>
                            Over {liveBallState.activeDelivery.over}.{liveBallState.activeDelivery.ballInOver}
                          </span>
                          <span style={{ marginLeft: 10, fontSize: '1rem', fontWeight: 600 }}>
                            {liveBallState.activeDelivery.bowlerId?.name || 'Bowler'} to {liveBallState.activeDelivery.strikerId?.name || 'Striker'}
                          </span>
                        </div>
                        <div>
                          {liveBallState.activeDelivery.isWicket && (
                            <span className="badge badge-solid" style={{ background: '#ef4444', color: '#fff', fontSize: '0.9rem' }}>
                              WICKET! ({liveBallState.activeDelivery.wicketType || 'Out'})
                            </span>
                          )}
                          {!liveBallState.activeDelivery.isWicket && liveBallState.activeDelivery.runsBat === 4 && (
                            <span className="badge badge-solid" style={{ background: '#0284c7', color: '#fff', fontSize: '0.9rem' }}>FOUR (4)!</span>
                          )}
                          {!liveBallState.activeDelivery.isWicket && liveBallState.activeDelivery.runsBat === 6 && (
                            <span className="badge badge-solid" style={{ background: '#10b981', color: '#fff', fontSize: '0.9rem' }}>SIX (6)!</span>
                          )}
                          {!liveBallState.activeDelivery.isWicket && liveBallState.activeDelivery.runsBat < 4 && liveBallState.activeDelivery.extraType && (
                            <span className="badge badge-solid" style={{ background: '#f59e0b', color: '#fff', fontSize: '0.9rem' }}>
                              {liveBallState.activeDelivery.extraType.toUpperCase()} (+{liveBallState.activeDelivery.extraRuns || 1})
                            </span>
                          )}
                          {!liveBallState.activeDelivery.isWicket && liveBallState.activeDelivery.runsBat < 4 && !liveBallState.activeDelivery.extraType && (
                            <span className="badge badge-outline" style={{ fontSize: '0.9rem' }}>
                              {liveBallState.activeDelivery.runsBat === 0 ? 'Dot Ball (0)' : `${liveBallState.activeDelivery.runsBat} Run${liveBallState.activeDelivery.runsBat > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Simulation Analysis Card AT THIS BALL */}
                  {liveBallState && (
                    <div className="card" style={{ marginBottom: 20, borderTop: '4px solid #10b981' }}>
                      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p className="eyebrow" style={{ color: '#10b981', fontWeight: 700 }}>⚡ SIMULATION ENGINE STATE AT BALL {ballIndex + 1}</p>
                          <h3 style={{ margin: 0 }}>
                            {activeBattingTeamName}: {liveBallState.totalRuns}/{liveBallState.wickets} <span className="muted" style={{ fontSize: '0.95rem' }}>({liveBallState.oversString} Overs)</span>
                          </h3>
                        </div>
                        <span className="badge badge-outline" style={{ textTransform: 'uppercase' }}>
                          Phase: {liveBallState.phase}
                        </span>
                      </div>

                      {/* Win Probability Bar */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                          <span>{activeBattingTeamName}: {liveBallState.battingWinProb}%</span>
                          <span>{activeBowlingTeamName}: {liveBallState.bowlingWinProb}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', background: '#e2e8f0' }}>
                          <div
                            style={{
                              width: `${liveBallState.battingWinProb}%`,
                              background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                              transition: 'width 0.2s ease'
                            }}
                          />
                          <div
                            style={{
                              width: `${liveBallState.bowlingWinProb}%`,
                              background: 'linear-gradient(90deg, #f43f5e, #e11d48)',
                              transition: 'width 0.2s ease'
                            }}
                          />
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid-4" style={{ marginTop: 16 }}>
                        <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 14px', borderRadius: 8 }}>
                          <span className="eyebrow">Projected Score</span>
                          <strong style={{ fontSize: '1.25rem', color: '#8b5cf6', display: 'block' }}>
                            {liveBallState.projectedScore}
                          </strong>
                        </div>
                        <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 14px', borderRadius: 8 }}>
                          <span className="eyebrow">Current Run Rate</span>
                          <strong style={{ fontSize: '1.25rem', color: '#0284c7', display: 'block' }}>
                            {liveBallState.crr}
                          </strong>
                        </div>
                        <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 14px', borderRadius: 8 }}>
                          <span className="eyebrow">Required Run Rate</span>
                          <strong style={{ fontSize: '1.25rem', color: liveBallState.rrr > 10 ? '#ef4444' : '#10b981', display: 'block' }}>
                            {liveBallState.rrr !== null ? liveBallState.rrr : '—'}
                          </strong>
                        </div>
                        <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 14px', borderRadius: 8 }}>
                          <span className="eyebrow">Target / Equation</span>
                          <strong style={{ fontSize: '0.95rem', display: 'block', marginTop: 4 }}>
                            {inningsTarget ? `Need ${liveBallState.runsNeeded} off ${Math.max(0, (selected.oversLimit * 6) - liveBallState.legalBalls)}b` : `Target setting`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DYNAMIC SCOREBOARD AT THIS BALL */}
                  {liveBallState && (
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-title">
                        <h3>📋 Dynamic Scoreboard (Up to Ball {ballIndex + 1})</h3>
                        <span className="badge badge-outline">Innings {activeInningsNum}</span>
                      </div>

                      {/* Batting Card up to this ball */}
                      <h4 style={{ marginTop: 12, marginBottom: 8 }}>Batting Figures</h4>
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
                            {liveBallState.batters.map((b) => (
                              <tr key={b.id}>
                                <td><strong>{b.name}</strong></td>
                                <td><strong>{b.runs}</strong></td>
                                <td>{b.balls}</td>
                                <td>{b.fours}</td>
                                <td>{b.sixes}</td>
                                <td>{b.strikeRate}</td>
                                <td>
                                  {b.isOut ? (
                                    <span className="muted">{b.dismissal}</span>
                                  ) : (
                                    <strong style={{ color: '#16a34a' }}>not out</strong>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {liveBallState.batters.length === 0 && (
                              <tr><td colSpan="7" className="muted">No batters active yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Bowling Card up to this ball */}
                      <h4 style={{ marginTop: 20, marginBottom: 8 }}>Bowling Figures</h4>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Bowler</th>
                              <th>Overs</th>
                              <th>Runs</th>
                              <th>Wickets</th>
                              <th>Econ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveBallState.bowlers.map((b) => (
                              <tr key={b.id}>
                                <td><strong>{b.name}</strong></td>
                                <td>{b.overs}</td>
                                <td>{b.runs}</td>
                                <td><strong>{b.wickets}</strong></td>
                                <td>{b.economy}</td>
                              </tr>
                            ))}
                            {liveBallState.bowlers.length === 0 && (
                              <tr><td colSpan="5" className="muted">No bowlers recorded yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Fall of Wickets up to this ball */}
                      {liveBallState.fow.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                          <strong>Fall of Wickets: </strong>
                          <span className="muted" style={{ fontSize: '0.88rem' }}>
                            {liveBallState.fow.map((w) => `${w.score}-${w.wicketNumber} (${w.name}, ${w.overs} ov)`).join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FULL MATCH SCOREBOARD (Completed Innings) */}
              {activeTab === 'full_scoreboard' && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-title">
                    <h3>📊 Complete Innings {activeInningsNum} Scorecard</h3>
                    <span className="badge badge-solid">{activeBattingTeamName}</span>
                  </div>

                  {/* Full Batting Table */}
                  <h4 style={{ marginTop: 14, marginBottom: 8 }}>Batting Statistics</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Batter</th>
                          <th>Role</th>
                          <th>Runs</th>
                          <th>Balls</th>
                          <th>4s</th>
                          <th>6s</th>
                          <th>SR</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fullBattersForInnings.map((s) => (
                          <tr key={s._id}>
                            <td><strong>{s.playerId?.name || 'Player'}</strong></td>
                            <td><small className="muted">{s.playerId?.role || 'Batter'}</small></td>
                            <td><strong>{s.batting?.runs || 0}</strong></td>
                            <td>{s.batting?.ballsFaced || 0}</td>
                            <td>{s.batting?.fours || 0}</td>
                            <td>{s.batting?.sixes || 0}</td>
                            <td>{s.batting?.strikeRate?.toFixed(1) || '0.0'}</td>
                            <td>
                              {s.batting?.isOut ? (
                                <span className="muted">{s.batting?.dismissalType || 'out'}</span>
                              ) : (
                                <strong style={{ color: '#16a34a' }}>not out</strong>
                              )}
                            </td>
                          </tr>
                        ))}
                        {fullBattersForInnings.length === 0 && (
                          <tr><td colSpan="8" className="muted">No batting statistics recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Full Bowling Table */}
                  <h4 style={{ marginTop: 24, marginBottom: 8 }}>Bowling Statistics</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bowler</th>
                          <th>Role</th>
                          <th>Overs</th>
                          <th>Runs</th>
                          <th>Wickets</th>
                          <th>Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fullBowlersForInnings.map((s) => {
                          const balls = s.bowling?.ballsBowled || 0;
                          return (
                            <tr key={s._id}>
                              <td><strong>{s.playerId?.name || 'Player'}</strong></td>
                              <td><small className="muted">{s.playerId?.role || 'Bowler'}</small></td>
                              <td>{Math.floor(balls / 6)}.{balls % 6}</td>
                              <td>{s.bowling?.runsConceded || 0}</td>
                              <td><strong>{s.bowling?.wickets || 0}</strong></td>
                              <td>{s.bowling?.economy?.toFixed(2) || '0.00'}</td>
                            </tr>
                          );
                        })}
                        {fullBowlersForInnings.length === 0 && (
                          <tr><td colSpan="6" className="muted">No bowling statistics recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ANALYTICS & CHARTS */}
              {activeTab === 'analytics' && analytics && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3>📈 Innings {activeInningsNum} Analytics &amp; Run Progression</h3>

                  {analytics.progression?.perOver?.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h4>Runs Per Over (Manhattan)</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analytics.progression.perOver}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="over" label={{ value: 'Over', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Bar dataKey="runs" fill="#0284c7" name="Runs" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {analytics.progression?.cumulative?.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4>Cumulative Runs (Worm Progression)</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={analytics.progression.cumulative}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="ball" label={{ value: 'Ball #', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Total Runs', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="runs" stroke="#10b981" strokeWidth={2} dot={false} name="Total Runs" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {analytics.phases && (
                    <div style={{ marginTop: 24 }}>
                      <h4>Phase Breakdown (Powerplay / Middle / Death)</h4>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Phase</th>
                              <th>Runs</th>
                              <th>Wickets</th>
                              <th>Run Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(analytics.phases).map(([phaseName, stats]) => (
                              <tr key={phaseName}>
                                <td style={{ textTransform: 'capitalize' }}><strong>{phaseName}</strong></td>
                                <td>{stats.runs}</td>
                                <td>{stats.wickets}</td>
                                <td>{stats.runRate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {analytics.partnerships && analytics.partnerships.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4>Key Partnerships</h4>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Wicket</th>
                              <th>Runs</th>
                              <th>Balls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.partnerships.map((p, pIdx) => (
                              <tr key={pIdx}>
                                <td>{p.wicket ? `${p.wicket}${p.wicket === 1 ? 'st' : p.wicket === 2 ? 'nd' : p.wicket === 3 ? 'rd' : 'th'} Wicket` : `Partnership #${pIdx + 1}`}</td>
                                <td><strong>{p.runs}</strong></td>
                                <td>{p.balls}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BALL FEED */}
              {activeTab === 'ball_feed' && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-title">
                    <h3>📜 Ball-by-Ball Feed (Innings {activeInningsNum})</h3>
                    <span className="badge badge-outline">{inningsDeliveries.length} Deliveries</span>
                  </div>

                  <div className="table-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Over</th>
                          <th>Ball #</th>
                          <th>Bowler</th>
                          <th>Striker</th>
                          <th>Outcome</th>
                          <th>Total Runs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inningsDeliveries.map((d, dIdx) => (
                          <tr key={d._id || dIdx}>
                            <td><strong>{d.over}.{d.ballInOver}</strong></td>
                            <td>#{dIdx + 1}</td>
                            <td>{d.bowlerId?.name || 'Bowler'}</td>
                            <td>{d.strikerId?.name || 'Striker'}</td>
                            <td>
                              {d.isWicket ? (
                                <span className="badge badge-solid" style={{ background: '#ef4444', color: '#fff' }}>
                                  WICKET ({d.wicketType || 'Out'})
                                </span>
                              ) : d.runsBat === 4 ? (
                                <span className="badge badge-solid" style={{ background: '#0284c7', color: '#fff' }}>FOUR (4)</span>
                              ) : d.runsBat === 6 ? (
                                <span className="badge badge-solid" style={{ background: '#10b981', color: '#fff' }}>SIX (6)</span>
                              ) : d.extraType ? (
                                <span className="badge badge-outline">
                                  {d.extraType.toUpperCase()} (+{d.extraRuns || 1})
                                </span>
                              ) : d.runsBat === 0 ? (
                                <span className="muted">Dot</span>
                              ) : (
                                <span>{d.runsBat} run{d.runsBat > 1 ? 's' : ''}</span>
                              )}
                            </td>
                            <td><strong>{d.totalRuns}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selected && (
            <div className="card card-flat" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <h3>Select or Simulate a Match</h3>
              <p className="muted">
                Choose a simulated match from the catalog on the left, or configure and simulate a new match above to view the live ball-by-ball simulation engine and full scoreboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulation;
