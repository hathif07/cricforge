const express = require('express');
const { createPlayer, getPlayers, getPlayerById, updatePlayer, deletePlayer } = require('../controllers/playerController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getPlayers);
router.get('/:id', getPlayerById);
router.post('/', authenticate, authorize('admin', 'team_owner'), createPlayer);
router.put('/:id', authenticate, authorize('admin', 'team_owner'), updatePlayer);
router.delete('/:id', authenticate, authorize('admin', 'team_owner'), deletePlayer);

module.exports = router;
