import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import api from '../services/api';
import { joinMatchRoom, leaveMatchRoom, subscribeToMatchEvents } from '../services/socket';

const LiveMatch = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [activeInningsTab, setActiveInningsTab] = useState(0);
  const [feed, setFeed] = useState([]);

  const load = async () => {
    try {
      const [matchRes, scorecardRes] = await Promise.all([
        api.get(`/matches/${id}`),
        api.get(`/matches/${id}/scorecard`).catch(() => ({ data: { data: { innings: [] } } }))
      ]);

      const m = matchRes.data.data.match;
      setMatch(m);
      const list = m.innings || [];
      const currentInn = list[list.length - 1] || null;
      setInnings(currentInn);

      const sc = scorecardRes.data?.data;
      if (sc) {
        setScorecard(sc);
        const cardInnings = sc.innings || [];
        if (cardInnings.length > 0) {
          // Default to the latest / active innings tab
          setActiveInningsTab(cardInnings.length - 1);
          const currentCard = cardInnings[cardInnings.length - 1];
          if (currentCard?.simulationProgression?.length > 0) {
            const latestSim = currentCard.simulationProgression[currentCard.simulationProgression.length - 1];
            setSimulation({
              projectedScore: latestSim.projectedScore,
              winProbability: {
                battingTeam: { name: currentCard.battingTeamName, percent: latestSim.winProbabilityBatting },
                bowlingTeam: { name: currentCard.bowlingTeamName, percent: latestSim.winProbabilityBowling },
                teamA: { id: m.teamA?.id, name: m.teamA?.name, percent: latestSim.teamAWinProb },
                teamB: { id: m.teamB?.id, name: m.teamB?.name, percent: latestSim.teamBWinProb }
              },
              currentRunRate: latestSim.currentRunRate,
              requiredRunRate: latestSim.requiredRunRate,
              situation: latestSim.situation,
              oversString: latestSim.over,
              totalRuns: currentCard.totalRuns,
              totalWickets: currentCard.totalWickets
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to load match state:', e);
    }
  };

  const refreshScorecardOnly = async () => {
    try {
      const { data } = await api.get(`/matches/${id}/scorecard`);
      if (data?.data) {
        setScorecard(data.data);
      }
    } catch (e) {
      // Ignore background refresh errors
    }
  };

  useEffect(() => {
    load();
    joinMatchRoom(id);

    const unsubscribe = subscribeToMatchEvents({
      score_updated: (payload) => {
        setInnings((prev) => (prev ? {
          ...prev,
          totalRuns: payload.score,
          totalWickets: payload.wickets,
          totalBalls: payload.totalBalls
        } : prev));
      },
      simulation_updated: (payload) => {
        setSimulation(payload);
      },
      scorecard_updated: (payload) => {
        if (payload?.innings) {
          setScorecard(payload);
          setActiveInningsTab((prev) => Math.min(prev, payload.innings.length - 1));
        }
      },
      ball_scored: (payload) => {
        setFeed((prev) => [
          { text: describeDelivery(payload.delivery), key: payload.delivery._id || `b-${Date.now()}` },
          ...prev
        ].slice(0, 30));
        refreshScorecardOnly();
      },
      wicket: () => setFeed((prev) => [{ text: 'WICKET!', key: `w-${Date.now()}` }, ...prev].slice(0, 30)),
      innings_completed: () => load(),
      match_completed: () => load()
    });

    return () => {
      leaveMatchRoom(id);
      unsubscribe();
    };
    // eslint-disable-next-line
  }, [id]);

  const describeDelivery = (d) => {
    if (!d) return 'Ball delivered';
    if (d.isWicket) return `WICKET — ${d.wicket?.dismissedPlayerName || d.strikerName} (${d.wicket?.type || 'out'}) b ${d.bowlerName}`;
    if (d.extras?.type === 'wide') return `Wide (+1 run)${d.extras?.runs ? ` + ${d.extras.runs} extra` : ''}`;
    if (d.extras?.type === 'noBall') return `No Ball! (+1 run)${d.runsOffBat ? ` + ${d.runsOffBat} runs off bat` : ''}`;
    if (d.runsOffBat === 6) return `SIX! ${d.strikerName} launches ${d.bowlerName} over the ropes!`;
    if (d.runsOffBat === 4) return `FOUR! ${d.strikerName} finds the boundary off ${d.bowlerName}`;
    if (d.runsOffBat === 0 && (!d.extras || d.extras.type === 'none')) return `Dot ball (${d.bowlerName} to ${d.strikerName})`;
    return `${d.runsOffBat} run${d.runsOffBat === 1 ? '' : 's'} (${d.strikerName} off ${d.bowlerName})`;
  };

  if (!match) return <div className="spinner" />;

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';
  const teamAPercent = simulation?.winProbability?.teamA?.percent ?? 50;
  const teamBPercent = simulation?.winProbability?.teamB?.percent ?? (100 - teamAPercent);

  const cardInnings = scorecard?.innings || [];
  const currentCard = cardInnings[activeInningsTab] || cardInnings[cardInnings.length - 1] || null;

  const perOverData = currentCard?.progression?.perOver || [];
  const cumulativeData = currentCard?.progression?.cumulative || [];
  const simProgressionData = currentCard?.simulationProgression || [];
  const keyMoments = currentCard?.keyMoments || [];

  return (
    <div>
      {/* Top Header */}
      <div className="section-header">
        <div>
          <h1>{teamAName} vs {teamBName}</h1>
          <p className="muted">
            {match.venue?.name || 'Venue TBD'}{match.venue?.city ? `, ${match.venue.city}` : ''} &middot;{' '}
            <span className="badge badge-outline">{match.format}</span> &middot;{' '}
            <span className="badge badge-solid" style={{ textTransform: 'capitalize' }}>
              {match.status === 'live' ? '🔴 LIVE' : match.status.replace('_', ' ')}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/matches/${id}/scorecard`} className="btn">Post-Match Report</Link>
          <Link to={`/matches/${id}/score`} className="btn btn-primary">Open Scorer Pad</Link>
        </div>
      </div>

      {/* Live Big Score Box */}
      {innings ? (
        <div className="scorebox card card-flat" style={{ marginBottom: 24, borderLeft: '4px solid #0284c7' }}>
          <div>
            <p className="eyebrow">{innings.battingTeamName} batting (Innings {innings.inningsNumber})</p>
            <span className="runs">{innings.totalRuns}/{innings.totalWickets}</span>
            <span className="overs"> ({Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} ov)</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            {innings.target ? (
              <>
                <p className="eyebrow">Target: {innings.target}</p>
                <span className="runs" style={{ fontSize: '1.4rem', color: '#0284c7' }}>
                  Need {Math.max(innings.target - innings.totalRuns, 0)} runs
                </span>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  in {innings.maxOvers ? Math.max(innings.maxOvers * 6 - innings.totalBalls, 0) : '—'} balls
                </p>
              </>
            ) : (
              match.oversPerInnings && (
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  Max Overs: {match.oversPerInnings}
                </p>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">Match has not started yet.</div>
      )}

      {/* ⚡ BALL-BY-BALL SIMULATION & WIN PROBABILITY (Updates Every Ball) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <h3>⚡ Ball-by-Ball Live Simulation Analysis</h3>
          {simulation?.phase && (
            <span className="badge badge-solid" style={{ textTransform: 'capitalize', backgroundColor: '#0284c7' }}>
              {simulation.phase} Phase
            </span>
          )}
        </div>

        {simulation?.situation && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <strong>Match Situation:</strong> {simulation.situation}
          </div>
        )}

        <div className="scoreboard-grid" style={{ marginBottom: 20 }}>
          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Projected Score</span>
            <strong style={{ fontSize: '1.4rem' }}>{simulation?.projectedScore ?? '—'}</strong>
          </div>

          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Current Run Rate (CRR)</span>
            <strong style={{ fontSize: '1.4rem' }}>
              {simulation?.currentRunRate != null
                ? simulation.currentRunRate.toFixed(2)
                : (innings && innings.totalBalls > 0 ? ((innings.totalRuns / innings.totalBalls) * 6).toFixed(2) : '0.00')}
            </strong>
          </div>

          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Required Run Rate (RRR)</span>
            <strong style={{ fontSize: '1.4rem' }}>
              {simulation?.requiredRunRate != null ? simulation.requiredRunRate.toFixed(2) : (innings?.target ? '—' : 'N/A')}
            </strong>
          </div>

          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Win Probability</span>
            <strong style={{ fontSize: '1.2rem' }}>
              {teamAName}: {teamAPercent}% &middot; {teamBName}: {teamBPercent}%
            </strong>
          </div>
        </div>

        {/* Live Win Probability Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
            <span><strong>{teamAName}</strong> {teamAPercent}%</span>
            <span><strong>{teamBName}</strong> {teamBPercent}%</span>
          </div>
          <div style={{ width: '100%', height: 14, borderRadius: 7, backgroundColor: 'var(--gray-200, #e2e8f0)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${teamAPercent}%`, backgroundColor: '#0284c7', transition: 'width 0.4s ease' }} />
            <div style={{ width: `${teamBPercent}%`, backgroundColor: '#e11d48', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* 📊 FULL SCOREBOARD (Updates on Every Ball) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <h3>📊 Live Ball-by-Ball Scoreboard</h3>
          {/* Innings Tabs */}
          {cardInnings.length > 1 && (
            <div className="pill-nav">
              {cardInnings.map((inn, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pill ${activeInningsTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveInningsTab(idx)}
                >
                  Innings {inn.inningsNumber} ({inn.battingTeamName})
                </button>
              ))}
            </div>
          )}
        </div>

        {currentCard ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>
                {currentCard.battingTeamName} Innings &mdash; {currentCard.totalRuns}/{currentCard.totalWickets}{' '}
                <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
                  ({Math.floor(currentCard.totalBalls / 6)}.{currentCard.totalBalls % 6} overs)
                </span>
              </h4>
              {currentCard.isComplete && <span className="badge badge-outline">Innings Closed</span>}
            </div>

            {/* Live Batting Table */}
            <h5 style={{ marginTop: 14, marginBottom: 8 }}>Batting</h5>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batter</th>
                    <th>Status / Dismissal</th>
                    <th>R</th>
                    <th>B</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentCard.battingCard || []).map((b) => {
                    const isStriker = innings?.currentStriker === b.playerId;
                    const isNonStriker = innings?.currentNonStriker === b.playerId;
                    return (
                      <tr key={b.playerId} style={isStriker ? { backgroundColor: '#f0f9ff' } : {}}>
                        <td>
                          <strong>{b.name}</strong>
                          {isStriker && <span className="badge badge-solid" style={{ marginLeft: 6, fontSize: '0.7rem' }}>* Striker</span>}
                          {isNonStriker && <span className="badge badge-outline" style={{ marginLeft: 6, fontSize: '0.7rem' }}>Non-Striker</span>}
                        </td>
                        <td className="muted" style={{ fontSize: '0.85rem' }}>
                          {b.isOut ? (b.dismissal || 'out') : <strong>not out</strong>}
                        </td>
                        <td><strong>{b.runs}</strong></td>
                        <td>{b.balls}</td>
                        <td>{b.fours || 0}</td>
                        <td>{b.sixes || 0}</td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                      </tr>
                    );
                  })}
                  {(!currentCard.battingCard || currentCard.battingCard.length === 0) && (
                    <tr>
                      <td colSpan={7} className="muted" style={{ textAlign: 'center' }}>No deliveries recorded for this innings yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Live Bowling Table */}
            <h5 style={{ marginTop: 20, marginBottom: 8 }}>Bowling</h5>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bowler</th>
                    <th>O</th>
                    <th>M</th>
                    <th>R</th>
                    <th>W</th>
                    <th>Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentCard.bowlingCard || []).map((bw) => {
                    const isCurrentBowler = innings?.currentBowler === bw.playerId;
                    return (
                      <tr key={bw.playerId} style={isCurrentBowler ? { backgroundColor: '#f0fdf4' } : {}}>
                        <td>
                          <strong>{bw.name}</strong>
                          {isCurrentBowler && <span className="badge badge-solid" style={{ marginLeft: 6, fontSize: '0.7rem', backgroundColor: '#10b981' }}>Bowling</span>}
                        </td>
                        <td>{Math.floor(bw.balls / 6)}.{bw.balls % 6}</td>
                        <td>{bw.maidens || 0}</td>
                        <td>{bw.runs}</td>
                        <td><strong>{bw.wickets}</strong></td>
                        <td>{bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(2) : '0.00'}</td>
                      </tr>
                    );
                  })}
                  {(!currentCard.bowlingCard || currentCard.bowlingCard.length === 0) && (
                    <tr>
                      <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No bowling figures available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fall of Wickets */}
            {currentCard.fallOfWickets && currentCard.fallOfWickets.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h5 style={{ marginBottom: 6 }}>Fall of Wickets</h5>
                <p className="muted" style={{ fontSize: '0.875rem' }}>
                  {currentCard.fallOfWickets.map((w) => `${w.score}-${w.wicketNumber} (${w.dismissedPlayerName || 'Batter'}, ${w.overs} ov)`).join('  •  ')}
                </p>
              </div>
            )}

            {/* Partnerships */}
            {currentCard.partnerships && currentCard.partnerships.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h5 style={{ marginBottom: 6 }}>Partnerships</h5>
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
                      {currentCard.partnerships.map((p, pIdx) => (
                        <tr key={pIdx}>
                          <td>{p.wicketNumber ? `${p.wicketNumber}${p.wicketNumber === 1 ? 'st' : p.wicketNumber === 2 ? 'nd' : p.wicketNumber === 3 ? 'rd' : 'th'} Wicket` : `Partnership #${pIdx + 1}`}</td>
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
        ) : (
          <div className="empty-state">Waiting for the first delivery to populate scoreboard…</div>
        )}
      </div>

      {/* Over & Win Progression Charts */}
      {(perOverData.length > 0 || simProgressionData.length > 0) && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            <h3>📈 Match Progression &amp; Simulation Trends</h3>
          </div>

          {perOverData.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Runs per Over (Manhattan)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={perOverData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="over" label={{ value: 'Over', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="runs" fill="#0284c7" name="Runs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {cumulativeData.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4>Cumulative Run Progression (Worm)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="ball" label={{ value: 'Ball #', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="runs" stroke="#10b981" strokeWidth={2} dot={false} name="Total Runs" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {simProgressionData.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4>Win Probability Progression (%)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={simProgressionData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="ball" label={{ value: 'Ball #', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[0, 100]} label={{ value: 'Win %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="teamAWinProb" stroke="#0284c7" strokeWidth={2} dot={false} name={`${teamAName} Win %`} />
                  <Line type="monotone" dataKey="teamBWinProb" stroke="#e11d48" strokeWidth={2} dot={false} name={`${teamBName} Win %`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Key Match Moments */}
      {keyMoments.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>🎯 Key Match Moments</h3>
          <div style={{ marginTop: 12 }}>
            {keyMoments.map((m, mIdx) => (
              <div
                key={mIdx}
                style={{
                  padding: '10px 14px',
                  borderBottom: mIdx < keyMoments.length - 1 ? '1px solid var(--gray-200, #e2e8f0)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <span className={`badge ${m.type === 'wicket' ? 'badge-solid' : 'badge-outline'}`} style={{ minWidth: 70, textAlign: 'center' }}>
                  Over {m.over}
                </span>
                <span>{m.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ball-by-Ball Commentary Feed */}
      <h3>🎙️ Live Ball-by-Ball Commentary</h3>
      <div className="card">
        {feed.length === 0 && <p className="muted">Waiting for deliveries to be recorded…</p>}
        {feed.map((f) => (
          <p key={f.key} style={{ borderBottom: '1px solid var(--gray-200, #e2e8f0)', padding: '10px 0', margin: 0 }}>
            {f.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default LiveMatch;
