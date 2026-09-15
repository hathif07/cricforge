const express = require('express');
const matchController = require('../controllers/matchController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', matchController.listMatches);
router.get('/:id', matchController.getMatch);
router.get('/:id/scorecard', matchController.getScorecard);
router.get('/:matchId/innings/:inningsId/live', matchController.getLiveState);

router.post('/', authenticate, authorize('admin', 'scorer', 'tournament_organizer'), matchController.createMatch);
router.post('/:id/toss', authenticate, authorize('admin', 'scorer'), matchController.setToss);
router.post('/:id/playing-xi', authenticate, authorize('admin', 'scorer', 'team_owner'), matchController.setPlayingXI);
router.post('/:id/start', authenticate, authorize('admin', 'scorer'), matchController.startMatch);
router.post('/:id/start-second-innings', authenticate, authorize('admin', 'scorer'), matchController.startSecondInnings);
router.post('/innings/:inningsId/batters', authenticate, authorize('admin', 'scorer'), matchController.setBatter);

module.exports = router;
