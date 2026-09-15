import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { joinMatchRoom, leaveMatchRoom, subscribeToMatchEvents } from '../services/socket';

const LiveMatch = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [feed, setFeed] = useState([]);

  const load = async () => {
    const { data } = await api.get(`/matches/${id}`);
    setMatch(data.data.match);
    const list = data.data.match.innings;
    setInnings(list[list.length - 1] || null);
  };

  useEffect(() => {
    load();
    joinMatchRoom(id);

    const unsubscribe = subscribeToMatchEvents({
      score_updated: (payload) => {
        setInnings((prev) => (prev ? { ...prev, totalRuns: payload.score, totalWickets: payload.wickets, totalBalls: payload.totalBalls } : prev));
      },
      ball_scored: (payload) => {
        setFeed((prev) => [
          { text: describeDelivery(payload.delivery), key: payload.delivery._id },
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

  return (
    <div>
      <div className="section-header">
        <h1>{match.teamA.name} vs {match.teamB.name}</h1>
        <Link to={`/matches/${id}/scorecard`} className="btn">Full Scorecard</Link>
      </div>

      {innings ? (
        <div className="scorebox card card-flat" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">{innings.battingTeamName} batting</p>
            <span className="runs">{innings.totalRuns}/{innings.totalWickets}</span>
            <span className="overs"> ({Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} ov)</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">Match has not started yet.</div>
      )}

      <h3>Live Commentary</h3>
      <div className="card">
        {feed.length === 0 && <p className="muted">Waiting for the next delivery…</p>}
        {feed.map((f) => <p key={f.key} style={{ borderBottom: '1px solid var(--gray-200)', padding: '8px 0' }}>{f.text}</p>)}
      </div>
    </div>
  );
};

export default LiveMatch;
