import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../services/api';

const Scorecard = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    api.get(`/matches/${id}/scorecard`).then(({ data }) => setData(data.data));
  }, [id]);

  if (!data) return <div className="spinner" />;

  const { match, innings } = data;
  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';
  const isCompleted = match.status === 'completed';

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>{teamAName} vs {teamBName}</h1>
          <p className="muted">
            {match.venue?.name || 'Venue TBD'} &middot; <span className="badge badge-outline">{match.format}</span> &middot; <span className="badge badge-solid">{match.status.replace('_', ' ')}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/matches" className="btn">← Back to Matches</Link>
          <Link to={`/matches/${id}/live`} className="btn btn-primary">Spectator Screen</Link>
        </div>
      </div>

      {/* Match Summary & Result Banner */}
      <div className="card card-flat" style={{ marginBottom: 24, borderLeft: '4px solid #0284c7' }}>
        <h3>📋 Match Summary</h3>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div>
            <p><strong>Format:</strong> {match.format} ({match.oversPerInnings ? `${match.oversPerInnings} overs` : 'Standard'})</p>
            <p><strong>Venue:</strong> {match.venue?.name || 'TBD'}{match.venue?.city ? `, ${match.venue.city}` : ''}</p>
            {match.toss?.winner && (
              <p><strong>Toss:</strong> {match.toss.winner === match.teamA?.id ? teamAName : teamBName} won the toss and elected to {match.toss.decision}.</p>
            )}
          </div>
          <div>
            <p><strong>Status:</strong> <span className="badge badge-solid" style={{ textTransform: 'capitalize' }}>{match.status.replace('_', ' ')}</span></p>
            {match.result?.winner && (
              <div className="alert alert-success" style={{ marginTop: 8, padding: '10px 14px' }}>
                <strong>Result:</strong> {match.result.winner === 'Tie' ? 'Match Tied' : `${match.result.winner} won by ${match.result.margin} ${match.result.marginType || ''}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Performance Highlights (Overall Standouts) */}
      {innings.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>🌟 Player Performance Highlights</h3>
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div>
              <h4 style={{ marginBottom: 8 }}>Top Batters</h4>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Batter</th><th>Innings</th><th>Runs</th><th>Balls</th><th>SR</th></tr>
                  </thead>
                  <tbody>
                    {innings.flatMap((inn) => (inn.topBatters || []).map((b) => ({ ...b, team: inn.battingTeamName }))).slice(0, 4).map((b, idx) => (
                      <tr key={idx}>
                        <td><strong>{b.name}</strong> <small className="muted">({b.team})</small></td>
                        <td>{b.runs}</td>
                        <td>{b.balls}</td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                        <td>{b.isOut ? b.dismissal : 'not out'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: 8 }}>Top Bowlers</h4>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Bowler</th><th>Innings</th><th>Wkts</th><th>Runs</th><th>Econ</th></tr>
                  </thead>
                  <tbody>
                    {innings.flatMap((inn) => (inn.topBowlers || []).map((b) => ({ ...b, team: inn.bowlingTeamName }))).slice(0, 4).map((b, idx) => (
                      <tr key={idx}>
                        <td><strong>{b.name}</strong> <small className="muted">({b.team})</small></td>
                        <td>{b.wickets}</td>
                        <td>{b.runs}</td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '0.00'}</td>
                        <td>{Math.floor(b.balls / 6)}.{b.balls % 6} ov</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Innings Tabs if multiple innings */}
      {innings.length > 1 && (
        <div className="pill-nav" style={{ marginBottom: 16 }}>
          {innings.map((inn, idx) => (
            <button
              key={inn.inningsNumber}
              className={`pill-btn${activeTab === idx ? ' active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              Innings {inn.inningsNumber}: {inn.battingTeamName} ({inn.totalRuns}/{inn.totalWickets})
            </button>
          ))}
        </div>
      )}

      {/* Innings Details */}
      {innings.map((inn, idx) => {
        if (innings.length > 1 && activeTab !== idx) return null;

        const perOverData = inn.progression?.perOver || [];
        const cumulativeData = inn.progression?.cumulative || [];
        const simData = inn.simulationProgression || [];
        const moments = inn.keyMoments || [];

        return (
          <div key={inn.inningsNumber} className="section">
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">
                <h2>{inn.battingTeamName} — {inn.totalRuns}/{inn.totalWickets}</h2>
                <span className="badge badge-outline">({Math.floor(inn.totalBalls / 6)}.{inn.totalBalls % 6} Overs)</span>
              </div>

              {/* Batting Card */}
              <h3>Batting Statistics</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Batter</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {inn.battingCard.map((b) => (
                      <tr key={b.playerId}>
                        <td><strong>{b.name}</strong></td>
                        <td>{b.runs}</td>
                        <td>{b.balls}</td>
                        <td>{b.fours}</td>
                        <td>{b.sixes}</td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                        <td>{b.isOut ? <span className="muted">{b.dismissal}</span> : <strong style={{ color: '#16a34a' }}>not out</strong>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bowling Card */}
              <h3 style={{ marginTop: 24 }}>Bowling Statistics</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Bowler</th><th>Overs</th><th>Maidens</th><th>Runs</th><th>Wickets</th><th>Econ</th></tr>
                  </thead>
                  <tbody>
                    {inn.bowlingCard.map((b) => (
                      <tr key={b.playerId}>
                        <td><strong>{b.name}</strong></td>
                        <td>{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                        <td>{b.maidens || 0}</td>
                        <td>{b.runs}</td>
                        <td><strong>{b.wickets}</strong></td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fall of Wickets */}
              {inn.fallOfWickets && inn.fallOfWickets.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h4>Fall of Wickets</h4>
                  <p className="muted" style={{ fontSize: '0.9rem' }}>
                    {inn.fallOfWickets.map((w) => `${w.score}-${w.wicketNumber} (${w.dismissedPlayerName || 'Batter'}, ${w.overs} ov)`).join(' &bull; ')}
                  </p>
                </div>
              )}

              {/* Partnerships */}
              {inn.partnerships && inn.partnerships.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h4>Partnerships</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr><th>Wicket</th><th>Runs</th><th>Balls</th></tr>
                      </thead>
                      <tbody>
                        {inn.partnerships.map((p, pIdx) => (
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

            {/* Over & Match Progression Charts */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3>📈 Over &amp; Match Progression</h3>
              
              {perOverData.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Runs per Over (Manhattan)</h4>
                  <ResponsiveContainer width="100%" height={220}>
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
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={cumulativeData}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="ball" label={{ value: 'Ball #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Total Runs', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="runs" stroke="#10b981" strokeWidth={2} dot={false} name="Runs" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Ball-by-Ball Simulation Analysis & Progression */}
            {simData.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3>⚡ Ball-by-Ball Simulation Analysis &amp; Win Probability Progression</h3>

                <div style={{ marginTop: 16 }}>
                  <h4>Win Probability Progression (%)</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={simData}>
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

                <div style={{ marginTop: 24 }}>
                  <h4>Projected Score Progression</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={simData}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="ball" label={{ value: 'Ball #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Projected Total', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="projectedScore" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Projected Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Key Match Moments */}
            {moments.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3>🎯 Key Match Moments</h3>
                <div style={{ marginTop: 12 }}>
                  {moments.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      style={{
                        padding: '10px 14px',
                        borderBottom: mIdx < moments.length - 1 ? '1px solid var(--gray-200, #e2e8f0)' : 'none',
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
          </div>
        );
      })}

      {innings.length === 0 && (
        <div className="empty-state">No innings recorded for this match yet.</div>
      )}
    </div>
  );
};

export default Scorecard;

