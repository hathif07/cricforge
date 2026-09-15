const mongoose = require('mongoose');

const overSchema = new mongoose.Schema({
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Innings', required: true },
    overNumber: { type: Number, required: true },
    bowlerId: { type: String, required: true },
    bowlerName: String,
    legalDeliveries: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    extras: {
        wides: { type: Number, default: 0 },
        noBalls: { type: Number, default: 0 },
        byes: { type: Number, default: 0 },
        legByes: { type: Number, default: 0 }
    },
    isMaiden: { type: Boolean, default: false },
    isComplete: { type: Boolean, default: false },
    deliveries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' }]
}, { timestamps: true });

module.exports = mongoose.model('Over', overSchema);
