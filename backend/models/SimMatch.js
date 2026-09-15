const mongoose = require('mongoose');

/**
 * SimMatch model.
 *
 * NOTE ON MERGE: Module 5 (Simulation + Statistics + Analytics) shipped
 * with its own "Match" and "Delivery" schemas, separate from the full
 * production Scoring Engine's Match/Innings/Over/Delivery models (see
 * Match.js / Delivery.js). Both original files called
 * `mongoose.model('Match', ...)` / `mongoose.model('Delivery', ...)` -
 * loading them in the same process throws OverwriteModelError and crashes
 * the server. Rather than force Module 5's rating-driven simulation engine
 * (which reasons in whole overs/innings, not individual Over documents) to
 * be rewritten against the production ball-by-ball engine's richer schema,
 * these are kept as their own lightweight, clearly-named collections:
 * SimMatch / SimDelivery. This is a deliberate, documented design choice
 * (see README) rather than a silent hack - simulated matches and
 * replay/manually-scored matches are related but structurally different
 * enough that unifying them fully would require re-engineering the
 * simulation engine, which is out of scope for this integration pass.
 * Both still reference the same canonical Player/Team collections.
 */
const simMatchSchema = new mongoose.Schema(
  {
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    oversLimit: { type: Number, default: 20 },
    status: {
      type: String,
      enum: ['scheduled', 'toss_done', 'in_progress', 'completed', 'abandoned'],
      default: 'scheduled',
    },
    tossWinnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    tossDecision: { type: String, enum: ['bat', 'bowl'] },
    source: { type: String, enum: ['manual', 'simulated'], default: 'simulated' },
    innings: [
      {
        inningsNumber: Number,
        battingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        bowlingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        totalRuns: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
      },
    ],
    winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    resultMargin: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SimMatch', simMatchSchema);
