const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/report', ctrl.report);
router.post('/check', ctrl.check);
router.post('/reset', ctrl.reset);

module.exports = router;
