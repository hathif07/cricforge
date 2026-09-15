const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Innings', required: true },
    batter1Id: { type: String, required: true },
    batter1Name: String,
    batter2Id: { type: String, required: true },
    batter2Name: String,
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    wicketNumber: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Partnership', partnershipSchema);
