const mongoose = require('mongoose');

/**
 * Canonical Player model.
 *
 * NOTE ON MERGE: two of the original submitted modules each defined their
 * own separate "Player" schema (CricForge_Player_Team_Module and the
 * Module 5 simulation/statistics package). Having two different files call
 * `mongoose.model('Player', ...)` in the same process throws
 * `OverwriteModelError` and crashes the server immediately - this was the
 * central integration bug blocking the merge. This file is the single
 * source of truth every other module now imports, combining fields from
 * both originals plus auction fields (basePrice/soldPrice/isSold) that
 * neither original module had.
 */
const playerSchema = new mongoose.Schema(
  {
    playerId: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 10, max: 80 },
    role: {
      type: String,
      required: true,
      enum: ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'],
      default: 'Batter'
    },
    battingStyle: {
      type: String,
      enum: ['Right Hand', 'Left Hand', 'Not Specified'],
      default: 'Not Specified'
    },
    bowlingStyle: { type: String, default: 'Not Specified' },
    jerseyNumber: { type: Number, min: 0, max: 999 },

    // Team association (kept in sync with Team.players[] by the
    // Team/Player and Auction controllers).
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

    // Used by the Simulation Engine (Module 5) to weight ball outcomes.
    battingRating: { type: Number, min: 0, max: 100, default: 50 },
    bowlingRating: { type: Number, min: 0, max: 100, default: 50 },

    // Used by the Auction module.
    basePrice: { type: Number, default: 0.5 },
    soldPrice: { type: Number, default: null },
    isSold: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);
