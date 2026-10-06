import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { joinMatchRoom, leaveMatchRoom, subscribeToMatchEvents } from '../services/socket';

const LiveMatch = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [simulation, setSimulation] = useState(null);
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

      // Extract latest simulation data from scorecard if available
      const cardInnings = scorecardRes.data?.data?.innings || [];
      const currentCard = cardInnings[cardInnings.length - 1];
      if (currentCard && currentCard.simulationProgression?.length > 0) {
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
    } catch (e) {
      console.error('Failed to load match state:', e);
    }
  };

  useEffect(() => {
    load();
    joinMatchRoom(id);

    const unsubscribe = subscribeToMatchEvents({
      score_updated: (payload) => {
        setInnings((prev) => (prev ? { ...prev, totalRuns: payload.score, totalWickets: payload.wickets, totalBalls: payload.totalBalls } : prev));
      },
      simulation_updated: (payload) => {
        setSimulation(payload);
      },
      ball_scored: (payload) => {
        setFeed((prev) => [
          { text: describeDelivery(payload.delivery), key: payload.delivery._id || `b-${Date.now()}` },
          ...prev
        ].slice(0, 20));
      },
      wicket: () => setFeed((prev) => [{ text: 'WICKET!', key: `w-${Date.now()}` }, ...prev].slice(0, 20)),
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
    if (d.isWicket) return `WICKET — ${d.strikerName} out`;
    if (d.extras?.type === 'wide') return 'Wide';
    if (d.extras?.type === 'noBall') return `No Ball${d.runsOffBat ? ` + ${d.runsOffBat} runs` : ''}`;
    if (d.runsOffBat === 6) return 'SIX!';
    if (d.runsOffBat === 4) return 'FOUR!';
    return `${d.runsOffBat} run${d.runsOffBat === 1 ? '' : 's'}`;
  };

  if (!match) return <div className="spinner" />;

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';
  const teamAPercent = simulation?.winProbability?.teamA?.percent ?? 50;
  const teamBPercent = simulation?.winProbability?.teamB?.percent ?? (100 - teamAPercent);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>{teamAName} vs {teamBName}</h1>
          <p className="muted">{match.venue?.name || 'Venue TBD'} &middot; <span className="badge badge-outline">{match.format}</span> &middot; <span className="badge badge-solid">{match.status.replace('_', ' ')}</span></p>
        </div>
        <Link to={`/matches/${id}/scorecard`} className="btn btn-primary">Match Report &amp; Scorecard</Link>
      </div>

      {innings ? (
        <div className="scorebox card card-flat" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">{innings.battingTeamName} batting</p>
            <span className="runs">{innings.totalRuns}/{innings.totalWickets}</span>
            <span className="overs"> ({Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} ov)</span>
          </div>
          {innings.target && (
            <div style={{ textAlign: 'right' }}>
              <p className="eyebrow">Target</p>
              <span className="runs" style={{ fontSize: '1.5rem' }}>{innings.target}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">Match has not started yet.</div>
      )}

      {/* Live Ball-by-Ball Simulation Analysis */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <h3>⚡ Ball-by-Ball Simulation Analysis</h3>
          {simulation?.phase && <span className="badge badge-solid" style={{ textTransform: 'capitalize' }}>{simulation.phase} Phase</span>}
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
            <strong style={{ fontSize: '1.4rem' }}>{simulation?.currentRunRate != null ? simulation.currentRunRate.toFixed(2) : (innings && innings.totalBalls > 0 ? ((innings.totalRuns / innings.totalBalls) * 6).toFixed(2) : '0.00')}</strong>
          </div>

          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Required Run Rate (RRR)</span>
            <strong style={{ fontSize: '1.4rem' }}>{simulation?.requiredRunRate != null ? simulation.requiredRunRate.toFixed(2) : (innings?.target ? '—' : 'N/A')}</strong>
          </div>

          <div className="card card-flat" style={{ padding: '12px 16px', background: 'var(--gray-50, #f8fafc)' }}>
            <span className="eyebrow">Win Probability</span>
            <strong style={{ fontSize: '1.2rem' }}>{teamAName}: {teamAPercent}% &middot; {teamBName}: {teamBPercent}%</strong>
          </div>
        </div>

        {/* Win Probability Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
            <span><strong>{teamAName}</strong> {teamAPercent}%</span>
            <span><strong>{teamBName}</strong> {teamBPercent}%</span>
          </div>
          <div style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: 'var(--gray-200, #e2e8f0)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${teamAPercent}%`, backgroundColor: '#0284c7', transition: 'width 0.4s ease' }} />
            <div style={{ width: `${teamBPercent}%`, backgroundColor: '#e11d48', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      <h3>Live Commentary</h3>
      <div className="card">
        {feed.length === 0 && <p className="muted">Waiting for the next delivery…</p>}
        {feed.map((f) => <p key={f.key} style={{ borderBottom: '1px solid var(--gray-200)', padding: '8px 0' }}>{f.text}</p>)}
      </div>
    </div>
  );
};

export default LiveMatch;

