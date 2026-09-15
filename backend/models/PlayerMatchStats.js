const mongoose = require('mongoose');

/** One document per player per simulated/local match, precomputed by the Statistics Engine. */
const playerMatchStatsSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'SimMatch', required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },

    batting: {
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      isOut: { type: Boolean, default: false },
      dismissalType: String,
    },

    bowling: {
      ballsBowled: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      economy: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

playerMatchStatsSchema.index({ matchId: 1, playerId: 1 }, { unique: true });

module.exports = mongoose.model('PlayerMatchStats', playerMatchStatsSchema);
