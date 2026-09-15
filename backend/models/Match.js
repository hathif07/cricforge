const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    teamA: { id: String, name: String },
    teamB: { id: String, name: String },
    format: {
        type: String,
        enum: ['T20', 'ODI', 'Test', 'Custom'],
        required: true
    },
    oversPerInnings: { type: Number },
    venue: {
        name: String,
        city: String,
        pitchType: {
            type: String,
            enum: ['batting', 'bowling', 'balanced', 'dusty', 'green']
        }
    },
    toss: {
        winner: String,
        decision: { type: String, enum: ['bat', 'bowl'] }
    },
    status: {
        type: String,
        enum: ['scheduled', 'toss', 'playing_xi', 'live', 'completed', 'abandoned', 'super_over'],
        default: 'scheduled'
    },
    result: {
        winner: String,
        margin: Number,
        marginType: { type: String, enum: ['runs', 'wickets'] },
        method: String
    },
    mode: {
        type: String,
        enum: ['manual', 'replay_assisted', 'simulation'],
        default: 'manual'
    },
    innings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Innings' }],
    createdBy: String
}, { timestamps: true });

matchSchema.pre('save', function (next) {
    if (!this.oversPerInnings) {
        if (this.format === 'T20') this.oversPerInnings = 20;
        else if (this.format === 'ODI') this.oversPerInnings = 50;
        else if (this.format === 'Test') this.oversPerInnings = null;
    }
    next();
});

module.exports = mongoose.model('Match', matchSchema);
