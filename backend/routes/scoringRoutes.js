const express = require('express');
const scoringController = require('../controllers/scoringController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/:matchId/innings/:inningsId/deliveries', authenticate, authorize('admin', 'scorer'), scoringController.recordDelivery);
router.delete('/:matchId/innings/:inningsId/deliveries/last', authenticate, authorize('admin', 'scorer'), scoringController.undoLastDelivery);

module.exports = router;
