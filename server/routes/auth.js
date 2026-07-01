const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', authenticate, requireAdmin, ctrl.register);
router.post('/register-public', ctrl.registerPublic);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
