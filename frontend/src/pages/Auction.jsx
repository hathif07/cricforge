import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const BID_INCREMENT = 0.5; // ₹50 Lakhs = 0.5 Cr

const Auction = () => {
  const { hasRole } = useAuth();

  const [auctions, setAuctions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);

  const [title, setTitle] = useState("");
  const [active, setActive] = useState(null);

  const [bidTeam, setBidTeam] = useState("");
  const [bidAmount, setBidAmount] = useState("");

  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD AUCTIONS
  // --------------------------------------------------
  const loadAuctions = async () => {
    try {
      const { data } = await api.get("/auction");
      setAuctions(data.data.auctions || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load auctions"
      );
    }
  };

  // --------------------------------------------------
  // LOAD TEAMS
  // --------------------------------------------------
  const loadTeams = async () => {
    try {
      const { data } = await api.get("/teams");
      setTeams(data.data.teams || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load teams"
      );
    }
  };

  useEffect(() => {
    loadAuctions();
    loadTeams();
  }, []);

  // --------------------------------------------------
  // OPEN AUCTION
  // --------------------------------------------------
  const openAuction = async (id) => {
    try {
      const { data } = await api.get(`/auction/${id}`);

      const auctionData = data.data;

      setActive(auctionData);
      setBidTeam("");
      setError("");

      const player = auctionData.currentPlayer;

      if (player) {
        const basePrice = Number(player.basePrice) || 0;
        const currentBid =
          Number(auctionData.auction.currentBid?.amount) || 0;

        // First bid starts at base price.
        // After a bid exists, show current bid.
        setBidAmount(currentBid > 0 ? currentBid : basePrice);
      } else {
        setBidAmount("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to open auction"
      );
    }
  };

  // --------------------------------------------------
  // CREATE AUCTION
  // --------------------------------------------------
  const createAuction = async (e) => {
    e.preventDefault();
    setError("");

    if (selectedTeamIds.length < 2) {
      setError("Please select at least two teams.");
      return;
    }

    try {
      const { data } = await api.post("/auction", {
        title,
        teamIds: selectedTeamIds
      });

      setTitle("");
      setSelectedTeamIds([]);

      await loadAuctions();

      await openAuction(data.data.auction._id);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create auction."
      );
    }
  };

  // --------------------------------------------------
  // SELECT TEAMS FOR AUCTION
  // --------------------------------------------------
  const toggleTeamSelect = (id) => {
    setSelectedTeamIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((teamId) => teamId !== id);
      }

      return [...previous, id];
    });
  };

  // --------------------------------------------------
  // SELECT BIDDING TEAM
  // --------------------------------------------------
  const selectBidTeam = (id) => {
    setBidTeam(id);
    setError("");
  };

  // --------------------------------------------------
  // INCREASE BID BY ₹50 LAKHS
  // --------------------------------------------------
  const increaseBid = () => {
    const current = Number(bidAmount) || 0;

    const newAmount = current + BID_INCREMENT;

    setBidAmount(Number(newAmount.toFixed(2)));
  };

  // --------------------------------------------------
  // PLACE BID
  // --------------------------------------------------
  const placeBid = async (e) => {
    e.preventDefault();
    setError("");

    if (!bidTeam) {
      setError("Please select a bidding team.");
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid bid amount.");
      return;
    }

    try {
      await api.post(
        `/auction/${active.auction._id}/bid`,
        {
          teamId: bidTeam,
          amount: amount
        }
      );

      await openAuction(active.auction._id);
    } catch (err) {
      setError(
        err.response?.data?.message || "Bid rejected."
      );
    }
  };

  // --------------------------------------------------
  // FINALIZE PLAYER
  // --------------------------------------------------
  const resolvePlayer = async () => {
    try {
      await api.post(
        `/auction/${active.auction._id}/resolve`
      );

      await openAuction(active.auction._id);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not resolve player."
      );
    }
  };

  // ==================================================
  // ACTIVE AUCTION PAGE
  // ==================================================
  if (active) {
    const {
      auction,
      currentPlayer,
      history = []
    } = active;

    return (
      <div>

        {/* HEADER */}
        <div className="section-header">
          <h1>{auction.title}</h1>

          <button
            className="btn"
            onClick={() => {
              setActive(null);
              setBidTeam("");
              setBidAmount("");
              setError("");
            }}
          >
            &larr; All Auctions
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* COMPLETED */}
        {auction.status === "completed" ? (
          <div className="alert alert-success">
            This auction has been completed.
          </div>
        ) : currentPlayer ? (

          <div className="grid-2">

            {/* ========================================
                PLAYER DETAILS
            ======================================== */}
            <div className="card card-flat">

              <p className="eyebrow">
                NOW BIDDING
              </p>

              <h2>
                {currentPlayer.name}
              </h2>

              <p className="muted">
                {currentPlayer.role}
              </p>

              <p className="muted">
                Batting Rating:{" "}
                {currentPlayer.battingRating}
              </p>

              <p className="muted">
                Bowling Rating:{" "}
                {currentPlayer.bowlingRating}
              </p>

              <hr className="divider" />

              <p className="eyebrow">
                BASE PRICE
              </p>

              <h2>
                ₹ {currentPlayer.basePrice} Cr
              </h2>

              <hr className="divider" />

              <p className="eyebrow">
                CURRENT BID
              </p>

              <h2>
                {Number(auction.currentBid?.amount) > 0
                  ? `${auction.currentBid.amount} Cr — ${
                      auction.currentBid.teamId?.teamName || ""
                    }`
                  : "No bids yet"}
              </h2>

              {hasRole(
                "admin",
                "tournament_organizer"
              ) && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "15px" }}
                  onClick={resolvePlayer}
                >
                  Finalize Player
                </button>
              )}

            </div>

            {/* ========================================
                BIDDING SECTION
            ======================================== */}
            {hasRole("admin", "team_owner") && (
              <div className="card">

                <h3>
                  Place a Bid
                </h3>

                <form onSubmit={placeBid}>

                  {/* TEAM BUTTONS */}
                  <div className="form-group">

                    <label className="form-label">
                      Bidding Team
                    </label>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginTop: "10px"
                      }}
                    >

                      {auction.teams.map((team) => {
                        const selected =
                          bidTeam === team._id;

                        return (
                          <button
                            key={team._id}
                            type="button"
                            onClick={() =>
                              selectBidTeam(team._id)
                            }
                            style={{
                              padding: "12px 20px",
                              borderRadius: "8px",
                              border: selected
                                ? "2px solid #000"
                                : "1px solid #000",
                              background: selected
                                ? "#000"
                                : "#fff",
                              color: selected
                                ? "#fff"
                                : "#000",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                          >
                            {team.teamName}
                          </button>
                        );
                      })}

                    </div>

                    {bidTeam && (
                      <p className="muted">
                        Selected team:{" "}
                        {
                          auction.teams.find(
                            (team) =>
                              team._id === bidTeam
                          )?.teamName
                        }
                      </p>
                    )}

                  </div>

                  {/* BID AMOUNT */}
                  <div className="form-group">

                    <label className="form-label">
                      Bid Amount (Cr)
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center"
                      }}
                    >

                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="form-input"
                        value={bidAmount}
                        onChange={(e) =>
                          setBidAmount(e.target.value)
                        }
                        required
                      />

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={increaseBid}
                        style={{
                          whiteSpace: "nowrap"
                        }}
                      >
                        + ₹50 Lakhs
                      </button>

                    </div>

                    <p className="muted">
                      Each click increases the bid by
                      ₹50 Lakhs (0.5 Cr).
                    </p>

                  </div>

                  {/* PLACE BID */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={!bidTeam}
                  >
                    Place Bid
                  </button>

                </form>

              </div>
            )}

          </div>

        ) : (
          <div className="empty-state">
            No players remaining in the pool.
          </div>
        )}

        {/* ========================================
            BID HISTORY
        ======================================== */}
        <div
          className="section"
          style={{ marginTop: "32px" }}
        >

          <h3>
            Recent Bid History
          </h3>

          <div className="table-wrap">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Amount</th>
                  <th>Result</th>
                </tr>
              </thead>

              <tbody>
                {history.map((bid) => (
                  <tr key={bid._id}>

                    <td>
                      {bid.playerId?.name}
                    </td>

                    <td>
                      {bid.teamId?.teamName}
                    </td>

                    <td>
                      {bid.amount} Cr
                    </td>

                    <td>
                      <span className="badge badge-outline">
                        {bid.result}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

            {history.length === 0 && (
              <div className="empty-state">
                No bids placed yet.
              </div>
            )}

          </div>
        </div>

      </div>
    );
  }

  // ==================================================
  // AUCTION ROOM PAGE
  // ==================================================

  return (
    <div>

      <div className="section-header">
        <h1>
          Auction Room
        </h1>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* CREATE AUCTION */}
      {hasRole(
        "admin",
        "tournament_organizer"
      ) && (
        <div className="card">

          <h3>
            Start a New Auction
          </h3>

          <form onSubmit={createAuction}>

            <div className="form-group">

              <label className="form-label">
                Auction Title
              </label>

              <input
                className="form-input"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                required
              />

            </div>

            <div className="form-group">

              <label className="form-label">
                Participating Teams
              </label>

              <div className="pill-nav">

                {teams.map((team) => (
                  <span
                    key={team._id}
                    className={`pill ${
                      selectedTeamIds.includes(
                        team._id
                      )
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      toggleTeamSelect(team._id)
                    }
                  >
                    {team.teamName}
                  </span>
                ))}

              </div>

            </div>

            <button
              className="btn btn-primary"
              type="submit"
            >
              Create Auction
            </button>

          </form>
        </div>
      )}

      {/* AUCTION LIST */}
      <div className="section">

        <h3>
          Auctions
        </h3>

        <div className="card-grid">

          {auctions.map((auction) => (
            <div
              key={auction._id}
              className="card"
              onClick={() =>
                openAuction(auction._id)
              }
              style={{
                cursor: "pointer"
              }}
            >

              <h3>
                {auction.title}
              </h3>

              <p className="muted">
                {auction.teams
                  ?.map(
                    (team) =>
                      team.teamName
                  )
                  .join(" vs ")}
              </p>

              <span
                className={`badge ${
                  auction.status === "live"
                    ? "badge-solid"
                    : "badge-outline"
                }`}
              >
                {auction.status}
              </span>

            </div>
          ))}

          {auctions.length === 0 && (
            <div className="empty-state">
              No auctions yet.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Auction;