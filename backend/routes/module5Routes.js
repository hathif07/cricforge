const express = require('express');
const module5Controller = require('../controllers/module5Controller');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/matches', module5Controller.listSimMatches);
router.get('/matches/:id', module5Controller.getSimMatch);
router.get('/matches/:id/statistics', module5Controller.getMatchStatistics);
router.get('/matches/:id/analytics', module5Controller.getAnalytics);
router.get('/players/:playerId/career', module5Controller.getPlayerCareerStats);

router.post('/simulate', authenticate, authorize('admin', 'team_owner', 'tournament_organizer'), module5Controller.simulateMatch);

module.exports = router;
