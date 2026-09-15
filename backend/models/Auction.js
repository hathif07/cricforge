const mongoose = require('mongoose');

/**
 * Auction model.
 *
 * NOTE ON MERGE: the submitted Auction module (Kaushik Raghav B) was
 * frontend-only - AuctionModule.jsx ran entirely against hardcoded mock
 * arrays (TEAMS_SEED / PLAYER_POOL) with no backend calls at all, and was
 * never even imported by that module's own App.jsx entry point. This model
 * (plus AuctionBid.js, auctionController.js, auctionRoutes.js) is new,
 * built to give the auction room a real backend wired to the canonical
 * Player/Team collections, following the auction lifecycle described in
 * the project documentation (player pool -> bids -> sold/unsold -> purse
 * and squad update).
 */
const auctionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['setup', 'live', 'completed'], default: 'setup' },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    playerPool: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    currentIndex: { type: Number, default: 0 },
    currentBid: {
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
      amount: { type: Number, default: 0 }
    },
    maxSquadSize: { type: Number, default: 15 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
