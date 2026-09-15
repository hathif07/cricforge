const mongoose = require('mongoose');

const matchPlayerSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    teamId: { type: String, required: true },
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    playerRole: {
        type: String,
        enum: ['batter', 'bowler', 'all-rounder', 'wicketkeeper'],
        default: 'batter'
    },
    isCaptain: { type: Boolean, default: false },
    // BUG FIX: matchService.js checked `p.isWicketKeeper` (capital K) while
    // this schema field is `isWicketkeeper` (lowercase k). The mismatch
    // meant the wicketkeeper-count validation always evaluated against
    // `undefined` and never actually caught a missing keeper. Both the
    // model and every caller now consistently use `isWicketkeeper`.
    isWicketkeeper: { type: Boolean, default: false },
    battingOrder: { type: Number }
});

matchPlayerSchema.index({ matchId: 1, teamId: 1, playerId: 1 }, { unique: true });

module.exports = mongoose.model('MatchPlayer', matchPlayerSchema);
