const express = require('express');
const {
  createAuction,
  getAuctions,
  getAuctionState,
  placeBid,
  resolveCurrentPlayer,
  deleteAuction,
  updateAuction
} = require('../controllers/auctionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getAuctions);
router.get('/:id', getAuctionState);
router.post('/', authenticate, authorize('admin', 'tournament_organizer'), createAuction);
router.put('/:id', authenticate, authorize('admin', 'tournament_organizer'), updateAuction);
router.post('/:id/bid', authenticate, authorize('admin', 'team_owner'), placeBid);
router.post('/:id/resolve', authenticate, authorize('admin', 'tournament_organizer'), resolveCurrentPlayer);
router.delete('/:id', authenticate, authorize('admin', 'tournament_organizer'), deleteAuction);

module.exports = router;
