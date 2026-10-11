const express = require('express');
const { createPlayer, getPlayers, getPlayerById, updatePlayer, deletePlayer, updatePlayerStatus } = require('../controllers/playerController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getPlayers);
router.get('/:id', getPlayerById);
router.post('/', authenticate, authorize('admin', 'team_owner'), createPlayer);
router.put('/:id', authenticate, authorize('admin', 'team_owner'), updatePlayer);
router.patch('/:id/status', authenticate, authorize('admin', 'team_owner'), updatePlayerStatus);
router.delete('/:id', authenticate, authorize('admin', 'team_owner'), deletePlayer);

module.exports = router;
