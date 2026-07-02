const router = require('express').Router();
const ctrl = require('../controllers/dingtalkController');
const { authenticate } = require('../middleware/auth');

router.post('/webhook', ctrl.webhookCallback); // 钉钉回调不需要认证
router.use(authenticate);

router.post('/import', ctrl.importFromDingTalk);
router.post('/export', ctrl.exportToDingTalk);
router.post('/notify', ctrl.sendNotification);
router.get('/sync-logs', ctrl.getSyncLogs);

// 自动同步
router.post('/auto-sync/start', ctrl.startAutoSync);
router.post('/auto-sync/stop', ctrl.stopAutoSync);
router.get('/auto-sync/status', ctrl.getAutoSyncStatus);
router.post('/auto-sync/trigger', ctrl.triggerSync);

// 手动导入（钉钉 → 网站）
router.post('/import-from-dingtalk', ctrl.triggerImport);

module.exports = router;
