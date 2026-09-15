const mongoose = require('mongoose');

const inningsSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    battingTeamId: { type: String, required: true },
    battingTeamName: String,
    bowlingTeamId: { type: String, required: true },
    bowlingTeamName: String,
    inningsNumber: { type: Number, required: true, min: 1, max: 4 },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalBalls: { type: Number, default: 0 },
    totalExtras: {
        wides: { type: Number, default: 0 },
        noBalls: { type: Number, default: 0 },
        byes: { type: Number, default: 0 },
        legByes: { type: Number, default: 0 },
        penalties: { type: Number, default: 0 }
    },
    overs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Over' }],
    currentStriker: String,
    currentNonStriker: String,
    currentBowler: String,
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    },
    // BUG FIX: this field was read/written throughout scoringEngine.js and
    // matchService.js but was never declared on the schema, so Mongoose's
    // default strict mode silently dropped every write to it - `isComplete`
    // never actually persisted and always read back as undefined/false.
    isComplete: { type: Boolean, default: false },
    target: Number,
    isSuperOver: { type: Boolean, default: false },
    maxWickets: { type: Number, default: 10 },
    maxOvers: Number
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

inningsSchema.virtual('oversString').get(function () {
    const overs = Math.floor(this.totalBalls / 6);
    const balls = this.totalBalls % 6;
    return `${overs}.${balls}`;
});

module.exports = mongoose.model('Innings', inningsSchema);
