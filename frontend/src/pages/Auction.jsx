import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * NOTE ON MERGE / FIX: the original AuctionModule.jsx ran entirely against
 * hardcoded mock arrays (TEAMS_SEED / PLAYER_POOL) with no backend calls,
 * and wasn't even rendered by that module's own App.jsx. This page now
 * talks to the real /api/auction endpoints (see backend/controllers/
 * auctionController.js), which persist bids, purses and sold players
 * against the canonical Team/Player collections.
 */
const Auction = () => {
  const { hasRole, user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [title, setTitle] = useState('');
  const [active, setActive] = useState(null);
  const [bidTeam, setBidTeam] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');

  const loadAuctions = async () => {
    const { data } = await api.get('/auction');
    setAuctions(data.data.auctions);
  };
  const loadTeams = async () => {
    const { data } = await api.get('/teams');
    setTeams(data.data.teams);
  };

  useEffect(() => { loadAuctions(); loadTeams(); }, []);

  const openAuction = async (id) => {
    const { data } = await api.get(`/auction/${id}`);
    setActive(data.data);
    setError('');
  };

  const createAuction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auction', { title, teamIds: selectedTeamIds });
      setTitle(''); setSelectedTeamIds([]);
      loadAuctions();
      openAuction(data.data.auction._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create auction.');
    }
  };

  const placeBid = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/auction/${active.auction._id}/bid`, { teamId: bidTeam, amount: Number(bidAmount) });
      setBidAmount('');
      openAuction(active.auction._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Bid rejected.');
    }
  };

  const resolvePlayer = async () => {
    try {
      await api.post(`/auction/${active.auction._id}/resolve`);
      openAuction(active.auction._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resolve player.');
    }
  };

  const toggleTeamSelect = (id) => {
    setSelectedTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  if (active) {
    const { auction, currentPlayer, history } = active;
    return (
      <div>
        <div className="section-header">
          <h1>{auction.title}</h1>
          <button className="btn" onClick={() => setActive(null)}>&larr; All Auctions</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        {auction.status === 'completed' ? (
          <div className="alert alert-success">This auction has been completed. All players have been processed.</div>
        ) : currentPlayer ? (
          <div className="grid-2">
            <div className="card card-flat">
              <p className="eyebrow">Now Bidding ({auction.currentIndex + 1} / {auction.playerPool.length})</p>
              <h2>{currentPlayer.name}</h2>
              <p className="muted">{currentPlayer.role} · Bat {currentPlayer.battingRating} / Bowl {currentPlayer.bowlingRating}</p>
              <p className="muted">Base Price: {currentPlayer.basePrice} Cr</p>
              <hr className="divider" />
              <p className="eyebrow">Current Bid</p>
              <h2>{auction.currentBid?.amount ? `${auction.currentBid.amount} Cr — ${auction.currentBid.teamId?.teamName || ''}` : 'No bids yet'}</h2>

              {hasRole('admin', 'tournament_organizer') && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={resolvePlayer}>
                  Finalize Player (Sold / Unsold)
                </button>
              )}
            </div>

            {hasRole('admin', 'team_owner') && (
              <div className="card">
                <h3>Place a Bid</h3>
                <form onSubmit={placeBid}>
                  <div className="form-group">
                    <label className="form-label">Bidding Team</label>
                    <select className="form-select" value={bidTeam} onChange={(e) => setBidTeam(e.target.value)} required>
                      <option value="">Select team…</option>
                      {auction.teams.map((t) => (
                        <option key={t._id} value={t._id}>{t.teamName} ({t.purseRemaining} Cr left)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bid Amount (Cr)</label>
                    <input type="number" step="0.1" className="form-input" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required />
                  </div>
                  <button className="btn btn-primary btn-block">Place Bid</button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">No players remaining in the pool.</div>
        )}

        <div className="section" style={{ marginTop: 32 }}>
          <h3>Recent Bid History</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Player</th><th>Team</th><th>Amount</th><th>Result</th></tr></thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b._id}>
                    <td>{b.playerId?.name}</td>
                    <td>{b.teamId?.teamName}</td>
                    <td>{b.amount} Cr</td>
                    <td><span className="badge badge-outline">{b.result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <div className="empty-state">No bids placed yet.</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header"><h1>Auction Room</h1></div>

      {hasRole('admin', 'tournament_organizer') && (
        <div className="card">
          <h3>Start a New Auction</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={createAuction}>
            <div className="form-group">
              <label className="form-label">Auction Title</label>
              <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Participating Teams (select at least 2)</label>
              <div className="pill-nav">
                {teams.map((t) => (
                  <span
                    key={t._id}
                    className={`pill ${selectedTeamIds.includes(t._id) ? 'active' : ''}`}
                    onClick={() => toggleTeamSelect(t._id)}
                  >
                    {t.teamName}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn btn-primary">Create Auction</button>
          </form>
        </div>
      )}

      <div className="section">
        <h3>Auctions</h3>
        <div className="card-grid">
          {auctions.map((a) => (
            <div key={a._id} className="card" onClick={() => openAuction(a._id)} style={{ cursor: 'pointer' }}>
              <h3>{a.title}</h3>
              <p className="muted">{a.teams.map((t) => t.teamName).join(' vs ')}</p>
              <span className={`badge ${a.status === 'live' ? 'badge-solid' : 'badge-outline'}`}>{a.status}</span>
            </div>
          ))}
          {auctions.length === 0 && <div className="empty-state">No auctions yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default Auction;
