import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const Scorecard = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/matches/${id}/scorecard`).then(({ data }) => setData(data.data));
  }, [id]);

  if (!data) return <div className="spinner" />;

  return (
    <div>
      <div className="section-header">
        <h1>{data.match.teamA.name} vs {data.match.teamB.name}</h1>
        <span className="badge badge-outline">{data.match.format}</span>
      </div>

      {data.innings.map((inn) => (
        <div key={inn.inningsNumber} className="section">
          <h2>{inn.battingTeamName} — {inn.totalRuns}/{inn.totalWickets} ({Math.floor(inn.totalBalls / 6)}.{inn.totalBalls % 6} ov)</h2>

          <h3>Batting</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Batter</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th><th>Status</th></tr></thead>
              <tbody>
                {inn.battingCard.map((b) => (
                  <tr key={b.playerId}>
                    <td>{b.name}</td><td>{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td>
                    <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                    <td>{b.isOut ? b.dismissal : 'not out'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 20 }}>Bowling</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wickets</th><th>Econ</th></tr></thead>
              <tbody>
                {inn.bowlingCard.map((b) => (
                  <tr key={b.playerId}>
                    <td>{b.name}</td>
                    <td>{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                    <td>{b.runs}</td><td>{b.wickets}</td>
                    <td>{b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inn.fallOfWickets.length > 0 && (
            <p className="muted" style={{ marginTop: 12 }}>
              Fall of wickets: {inn.fallOfWickets.map((w) => `${w.score}-${w.wicketNumber} (${w.dismissedPlayerName}, ${w.overs})`).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default Scorecard;
