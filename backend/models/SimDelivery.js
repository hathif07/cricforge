const mongoose = require('mongoose');

/** Ball-by-ball delivery for simulated / rapid-demo matches. See SimMatch.js for why this is a separate collection from the production Delivery model. */
const simDeliverySchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'SimMatch', required: true, index: true },
    inningsNumber: { type: Number, required: true },
    over: { type: Number, required: true },
    ballInOver: { type: Number, required: true },

    battingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    bowlingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },

    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

    runsBat: { type: Number, default: 0 },
    extraType: { type: String, enum: [null, 'wide', 'no_ball', 'bye', 'leg_bye'], default: null },
    extraRuns: { type: Number, default: 0 },
    isWicket: { type: Boolean, default: false },
    wicketType: {
      type: String,
      enum: [null, 'bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket'],
      default: null,
    },
    dismissedPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },

    totalRuns: { type: Number, default: 0 },
  },
  { timestamps: true }
);

simDeliverySchema.index({ matchId: 1, inningsNumber: 1, over: 1, ballInOver: 1 });

module.exports = mongoose.model('SimDelivery', simDeliverySchema);
