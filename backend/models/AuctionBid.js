const mongoose = require('mongoose');

const auctionBidSchema = new mongoose.Schema(
  {
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    amount: { type: Number, required: true },
    result: { type: String, enum: ['pending', 'sold', 'unsold'], default: 'pending' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuctionBid', auctionBidSchema);
