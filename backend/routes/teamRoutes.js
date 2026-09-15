const express = require('express');
const { createTeam, getTeams, getTeamById, updateTeam, deleteTeam, addPlayerToTeam } = require('../controllers/teamController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getTeams);
router.get('/:id', getTeamById);
router.post('/', authenticate, authorize('admin', 'team_owner'), createTeam);
router.put('/:id', authenticate, authorize('admin', 'team_owner'), updateTeam);
router.delete('/:id', authenticate, authorize('admin'), deleteTeam);
router.post('/:id/players', authenticate, authorize('admin', 'team_owner'), addPlayerToTeam);

module.exports = router;
