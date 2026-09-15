const Auction = require('../models/Auction');
const AuctionBid = require('../models/AuctionBid');
const Player = require('../models/Player');
const Team = require('../models/Team');

// @desc Create a new auction session with a player pool and participating teams
exports.createAuction = async (req, res, next) => {
  try {
    const { title, teamIds, playerIds, maxSquadSize } = req.body;
    if (!title || !Array.isArray(teamIds) || teamIds.length < 2) {
      return res.status(400).json({ success: false, message: 'An auction requires a title and at least two participating teams' });
    }

    let pool = playerIds;
    if (!Array.isArray(pool) || pool.length === 0) {
      const unsoldPlayers = await Player.find({ isSold: false });
      pool = unsoldPlayers.map((p) => p._id);
    }

    const auction = await Auction.create({
      title: title.trim(),
      teams: teamIds,
      playerPool: pool,
      maxSquadSize: maxSquadSize || 15,
      createdBy: req.user ? req.user._id : null,
      status: 'live'
    });

    const populated = await Auction.findById(auction._id).populate('teams').populate('playerPool');
    res.status(201).json({ success: true, message: 'Auction created', data: { auction: populated } });
  } catch (error) {
    next(error);
  }
};

exports.getAuctions = async (req, res, next) => {
  try {
    const auctions = await Auction.find().populate('teams', 'teamName shortName purseRemaining').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { auctions } });
  } catch (error) {
    next(error);
  }
};

exports.getAuctionState = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('teams')
      .populate('playerPool')
      .populate('currentBid.teamId', 'teamName shortName purseRemaining');
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });

    const currentPlayer = auction.playerPool[auction.currentIndex] || null;
    const history = await AuctionBid.find({ auctionId: auction._id }).populate('teamId', 'teamName shortName').populate('playerId', 'name').sort({ createdAt: -1 }).limit(30);

    res.status(200).json({ success: true, data: { auction, currentPlayer, history } });
  } catch (error) {
    next(error);
  }
};

// @desc Place/raise a bid on the current player in the pool
exports.placeBid = async (req, res, next) => {
  try {
    const { teamId, amount } = req.body;
    const auction = await Auction.findById(req.params.id).populate('playerPool').populate('teams');
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.status !== 'live') return res.status(400).json({ success: false, message: 'This auction is not currently live' });

    const currentPlayer = auction.playerPool[auction.currentIndex];
    if (!currentPlayer) return res.status(400).json({ success: false, message: 'No player is currently up for bidding' });

    const team = auction.teams.find((t) => t._id.toString() === teamId);
    if (!team) return res.status(400).json({ success: false, message: 'Team is not part of this auction' });

    if (amount <= auction.currentBid.amount) {
      return res.status(400).json({ success: false, message: `Bid must be higher than the current bid of ${auction.currentBid.amount}` });
    }
    if (amount > team.purseRemaining) {
      return res.status(400).json({ success: false, message: 'Bid exceeds the remaining purse for this team' });
    }
    if (team.players.length >= auction.maxSquadSize) {
      return res.status(400).json({ success: false, message: 'Team has already reached the maximum squad size' });
    }

    auction.currentBid = { teamId, amount };
    await auction.save();

    await AuctionBid.create({ auctionId: auction._id, playerId: currentPlayer._id, teamId, amount, result: 'pending' });

    res.status(200).json({ success: true, message: 'Bid placed', data: { currentBid: auction.currentBid } });
  } catch (error) {
    next(error);
  }
};

// @desc Resolve the current player as sold (to the highest bidder) or unsold, then advance to the next player
exports.resolveCurrentPlayer = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id).populate('playerPool').populate('teams');
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });

    const currentPlayer = auction.playerPool[auction.currentIndex];
    if (!currentPlayer) return res.status(400).json({ success: false, message: 'No player is currently up for bidding' });

    if (auction.currentBid.teamId && auction.currentBid.amount > 0) {
      const winningTeam = await Team.findById(auction.currentBid.teamId);
      winningTeam.purseRemaining -= auction.currentBid.amount;
      winningTeam.players.push(currentPlayer._id);
      await winningTeam.save();

      currentPlayer.isSold = true;
      currentPlayer.soldPrice = auction.currentBid.amount;
      currentPlayer.teamId = winningTeam._id;
      await currentPlayer.save();

      await AuctionBid.updateMany(
        { auctionId: auction._id, playerId: currentPlayer._id, result: 'pending' },
        { $set: { result: 'unsold' } }
      );
      await AuctionBid.findOneAndUpdate(
        { auctionId: auction._id, playerId: currentPlayer._id, teamId: winningTeam._id, amount: auction.currentBid.amount },
        { $set: { result: 'sold' } }
      );
    } else {
      await AuctionBid.updateMany(
        { auctionId: auction._id, playerId: currentPlayer._id },
        { $set: { result: 'unsold' } }
      );
    }

    auction.currentIndex += 1;
    auction.currentBid = { teamId: null, amount: 0 };
    if (auction.currentIndex >= auction.playerPool.length) {
      auction.status = 'completed';
    }
    await auction.save();

    const refreshed = await Auction.findById(auction._id).populate('teams').populate('playerPool');
    const nextPlayer = refreshed.playerPool[refreshed.currentIndex] || null;

    res.status(200).json({ success: true, message: 'Player resolved', data: { auction: refreshed, nextPlayer } });
  } catch (error) {
    next(error);
  }
};
