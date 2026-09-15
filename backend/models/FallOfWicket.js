const mongoose = require('mongoose');

const fallOfWicketSchema = new mongoose.Schema({
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Innings', required: true },
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
    dismissedPlayerId: { type: String, required: true },
    dismissedPlayerName: String,
    score: { type: Number, required: true },
    overs: { type: String, required: true },
    wicketNumber: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('FallOfWicket', fallOfWicketSchema);
