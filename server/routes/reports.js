const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', ctrl.dashboard);
router.get('/trends', ctrl.trends);
router.post('/export', ctrl.exportReport);

module.exports = router;
