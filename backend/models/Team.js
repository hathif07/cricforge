const mongoose = require('mongoose');

/**
 * Canonical Team model - see the note in Player.js. This replaces the two
 * separate "Team" schemas that were defined independently by the
 * Player/Team module and the Module 5 package, and adds the purse fields
 * needed by the Auction module (neither original had these).
 */
const teamSchema = new mongoose.Schema(
  {
    teamId: { type: String, unique: true, sparse: true, trim: true },
    teamName: { type: String, required: true, unique: true, trim: true },
    shortName: { type: String, required: true, trim: true, maxlength: 5 },
    color: { type: String, default: '#000000' },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    viceCaptain: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],

    // Auction purse tracking.
    purseTotal: { type: Number, default: 100 },
    purseRemaining: { type: Number, default: 100 },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
