const router = require('express').Router();
const ctrl = require('../controllers/dingtalkController');
const { authenticate } = require('../middleware/auth');

router.post('/webhook', ctrl.webhookCallback); // 钉钉回调不需要认证
router.use(authenticate);

router.post('/import', ctrl.importFromDingTalk);
router.post('/export', ctrl.exportToDingTalk);
router.post('/notify', ctrl.sendNotification);
router.get('/sync-logs', ctrl.getSyncLogs);

module.exports = router;
