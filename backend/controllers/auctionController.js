const Auction = require("../models/Auction");
const AuctionBid = require("../models/AuctionBid");
const Player = require("../models/Player");
const Team = require("../models/Team");

// ============================================================
// CREATE AUCTION
// ============================================================
exports.createAuction = async (req, res, next) => {
  try {
    const {
      title,
      teamIds,
      playerIds,
      maxSquadSize
    } = req.body;

    if (
      !title ||
      !Array.isArray(teamIds) ||
      teamIds.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An auction requires a title and at least two participating teams"
      });
    }

    let pool = playerIds;

    // If player IDs are not supplied,
    // use all unsold players.
    if (!Array.isArray(pool) || pool.length === 0) {
      const unsoldPlayers = await Player.find({
        isSold: false
      });

      pool = unsoldPlayers.map(
        (player) => player._id
      );
    }

    const auction = await Auction.create({
      title: title.trim(),

      teams: teamIds,

      playerPool: pool,

      maxSquadSize:
        maxSquadSize || 15,

      createdBy:
        req.user
          ? req.user._id
          : null,

      status: "live",

      currentIndex: 0,

      currentBid: {
        teamId: null,
        amount: 0
      }
    });

    const populated =
      await Auction.findById(
        auction._id
      )
        .populate("teams")
        .populate("playerPool");

    res.status(201).json({
      success: true,
      message: "Auction created",
      data: {
        auction: populated
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GET ALL AUCTIONS
// ============================================================
exports.getAuctions = async (
  req,
  res,
  next
) => {
  try {

    const auctions =
      await Auction.find()
        .populate(
          "teams",
          "teamName shortName purseRemaining"
        )
        .sort({
          createdAt: -1
        });

    res.status(200).json({
      success: true,
      data: {
        auctions
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GET AUCTION STATE
// ============================================================
exports.getAuctionState = async (
  req,
  res,
  next
) => {
  try {

    const auction =
      await Auction.findById(
        req.params.id
      )
        .populate("teams")
        .populate("playerPool")
        .populate(
          "currentBid.teamId",
          "teamName shortName purseRemaining"
        );

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    const currentPlayer =
      auction.playerPool[
        auction.currentIndex
      ] || null;

    const history =
      await AuctionBid.find({
        auctionId:
          auction._id
      })
        .populate(
          "teamId",
          "teamName shortName"
        )
        .populate(
          "playerId",
          "name"
        )
        .sort({
          createdAt: -1
        })
        .limit(30);

    res.status(200).json({
      success: true,
      data: {
        auction,
        currentPlayer,
        history
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// PLACE BID
// ============================================================
exports.placeBid = async (
  req,
  res,
  next
) => {
  try {

    const {
      teamId,
      amount
    } = req.body;

    // --------------------------------------------------------
    // Validate input
    // --------------------------------------------------------
    if (
      !teamId ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Team and bid amount are required"
      });
    }

    const bidAmount =
      Number(amount);

    if (
      !Number.isFinite(bidAmount) ||
      bidAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Bid amount must be a valid positive number"
      });
    }

    // --------------------------------------------------------
    // Find auction
    // --------------------------------------------------------
    const auction =
      await Auction.findById(
        req.params.id
      )
        .populate("playerPool")
        .populate("teams");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    // --------------------------------------------------------
    // Auction must be live
    // --------------------------------------------------------
    if (
      auction.status !== "live"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This auction is not currently live"
      });
    }

    // --------------------------------------------------------
    // Current player
    // --------------------------------------------------------
    const currentPlayer =
      auction.playerPool[
        auction.currentIndex
      ];

    if (!currentPlayer) {
      return res.status(400).json({
        success: false,
        message:
          "No player is currently up for bidding"
      });
    }

    // --------------------------------------------------------
    // Check participating team
    // --------------------------------------------------------
    const team =
      auction.teams.find(
        (t) =>
          t._id.toString() ===
          teamId.toString()
      );

    if (!team) {
      return res.status(400).json({
        success: false,
        message:
          "Team is not part of this auction"
      });
    }

    // ========================================================
    // BASE PRICE
    // ========================================================
    const basePrice =
      Number(
        currentPlayer.basePrice
      ) || 0;

    // ========================================================
    // CURRENT BID
    // ========================================================
    const currentBid =
      Number(
        auction.currentBid?.amount
      ) || 0;

    // ========================================================
    // FIRST BID
    // ========================================================
    if (currentBid === 0) {

      if (bidAmount < basePrice) {

        return res.status(400).json({
          success: false,
          message:
            `First bid must be at least ${basePrice} Cr`
        });

      }
    }

    // ========================================================
    // NEXT BID
    // ========================================================
    if (currentBid > 0) {

      if (bidAmount <= currentBid) {

        return res.status(400).json({
          success: false,
          message:
            `Bid must be higher than the current bid of ${currentBid} Cr`
        });

      }
    }

    // ========================================================
    // CHECK PURSE
    // ========================================================
    const purseRemaining =
      Number(
        team.purseRemaining
      ) || 0;

    if (
      bidAmount >
      purseRemaining
    ) {

      return res.status(400).json({
        success: false,
        message:
          `Bid exceeds the remaining purse of ${purseRemaining} Cr`
      });

    }

    // ========================================================
    // CHECK SQUAD SIZE
    // ========================================================
    const playersCount =
      Array.isArray(team.players)
        ? team.players.length
        : 0;

    if (
      playersCount >=
      auction.maxSquadSize
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Team has already reached the maximum squad size"
      });

    }

    // ========================================================
    // SAVE CURRENT BID
    // ========================================================
    auction.currentBid = {
      teamId,
      amount: bidAmount
    };

    await auction.save();

    // ========================================================
    // SAVE BID HISTORY
    // ========================================================
    await AuctionBid.create({
      auctionId:
        auction._id,

      playerId:
        currentPlayer._id,

      teamId,

      amount:
        bidAmount,

      result:
        "pending"
    });

    // ========================================================
    // RESPONSE
    // ========================================================
    res.status(200).json({
      success: true,
      message:
        "Bid placed successfully",

      data: {
        currentBid:
          auction.currentBid
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// RESOLVE CURRENT PLAYER
// ============================================================
exports.resolvePlayer = async (
  req,
  res,
  next
) => {
  try {

    const auction =
      await Auction.findById(
        req.params.id
      )
        .populate("playerPool")
        .populate("teams");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message:
          "Auction not found"
      });
    }

    if (
      auction.status !== "live"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This auction is not currently live"
      });
    }

    // --------------------------------------------------------
    // Current player
    // --------------------------------------------------------
    const currentPlayer =
      auction.playerPool[
        auction.currentIndex
      ];

    if (!currentPlayer) {

      auction.status =
        "completed";

      await auction.save();

      return res.status(200).json({
        success: true,
        message:
          "Auction completed"
      });
    }

    // --------------------------------------------------------
    // Current bid
    // --------------------------------------------------------
    const currentBid =
      auction.currentBid || {};

    const bidAmount =
      Number(
        currentBid.amount
      ) || 0;

    let winningTeam =
      null;

    if (
      bidAmount > 0 &&
      currentBid.teamId
    ) {

      winningTeam =
        auction.teams.find(
          (team) =>
            team._id.toString() ===
            currentBid.teamId.toString()
        );
    }

    // ========================================================
    // SOLD
    // ========================================================
    if (winningTeam) {

      if (
        bidAmount >
        winningTeam.purseRemaining
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Winning bid exceeds the team remaining purse"
        });
      }

      // Deduct purse
      winningTeam.purseRemaining =
        Number(
          winningTeam.purseRemaining
        ) - bidAmount;

      // Add player to team
      if (
        !Array.isArray(
          winningTeam.players
        )
      ) {
        winningTeam.players = [];
      }

      winningTeam.players.push(
        currentPlayer._id
      );

      await winningTeam.save();

      // Mark player as sold
      currentPlayer.isSold =
        true;

      currentPlayer.soldPrice =
        bidAmount;

      currentPlayer.soldTo =
        winningTeam._id;

      await currentPlayer.save();

      // Mark bids as sold
      await AuctionBid.updateMany(
        {
          auctionId:
            auction._id,

          playerId:
            currentPlayer._id,

          result:
            "pending"
        },
        {
          $set: {
            result:
              "sold"
          }
        }
      );

    } else {

      // ======================================================
      // UNSOLD
      // ======================================================

      await AuctionBid.updateMany(
        {
          auctionId:
            auction._id,

          playerId:
            currentPlayer._id,

          result:
            "pending"
        },
        {
          $set: {
            result:
              "unsold"
          }
        }
      );
    }

    // ========================================================
    // NEXT PLAYER
    // ========================================================
    auction.currentIndex += 1;

    // Reset bid
    auction.currentBid = {
      teamId: null,
      amount: 0
    };

    // Complete auction
    if (
      auction.currentIndex >=
      auction.playerPool.length
    ) {
      auction.status =
        "completed";
    }

    await auction.save();

    // --------------------------------------------------------
    // Get updated auction
    // --------------------------------------------------------
    const updatedAuction =
      await Auction.findById(
        auction._id
      )
        .populate("teams")
        .populate("playerPool")
        .populate(
          "currentBid.teamId",
          "teamName shortName purseRemaining"
        );

    res.status(200).json({
      success: true,

      message: winningTeam
        ? `${currentPlayer.name} sold to ${winningTeam.teamName}`
        : `${currentPlayer.name} marked as unsold`,

      data: {
        auction:
          updatedAuction
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// COMPATIBILITY ALIAS
// ============================================================
exports.resolveCurrentPlayer =
  exports.resolvePlayer;