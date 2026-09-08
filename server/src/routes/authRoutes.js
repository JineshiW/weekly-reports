const express = require('express');
const auth = require('../controllers/authController');
const validateBody = require('../middleware/validateBody');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateBody(auth.registerSchema), auth.register);
router.post('/login', validateBody(auth.loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireLogin, auth.me);

module.exports = router;
