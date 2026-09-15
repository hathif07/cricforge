const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Innings', required: true },
    overId: { type: mongoose.Schema.Types.ObjectId, ref: 'Over', required: true },
    overNumber: { type: Number, required: true },
    ballNumber: { type: Number, required: true },
    sequenceNumber: { type: Number, required: true },
    strikerId: { type: String, required: true },
    strikerName: { type: String, required: true },
    nonStrikerId: { type: String, required: true },
    nonStrikerName: { type: String, required: true },
    bowlerId: { type: String, required: true },
    bowlerName: { type: String, required: true },
    runsOffBat: { type: Number, default: 0, min: 0, max: 6 },
    extras: {
        type: { type: String, enum: ['wide', 'noBall', 'bye', 'legBye', 'penalty', 'none'], default: 'none' },
        runs: { type: Number, default: 0 }
    },
    totalRuns: { type: Number, default: 0 },
    isLegal: { type: Boolean, default: true },
    isWicket: { type: Boolean, default: false },
    wicket: {
        type: { type: String, enum: ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'caughtAndBowled', 'retiredHurt', 'obstructingField', 'hitBallTwice', 'timedOut'] },
        dismissedPlayerId: String,
        dismissedPlayerName: String,
        fielderId: String,
        fielderName: String
    },
    isBoundary: { type: Boolean, default: false },
    isSix: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

deliverySchema.pre('save', function (next) {
    if (this.extras.type === 'wide' || this.extras.type === 'noBall') {
        this.isLegal = false;
    } else {
        this.isLegal = true;
    }

    let baseExtraRun = 0;
    if (this.extras.type === 'wide' || this.extras.type === 'noBall') {
        baseExtraRun = 1;
    }

    this.totalRuns = this.runsOffBat + this.extras.runs + baseExtraRun;
    this.isBoundary = this.runsOffBat === 4 || this.runsOffBat === 6;
    this.isSix = this.runsOffBat === 6;

    next();
});

deliverySchema.index({ matchId: 1, inningsId: 1, sequenceNumber: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
