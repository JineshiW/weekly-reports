const express = require('express');
const dashboard = require('../controllers/dashboardController');
const { requireLogin, requireManager } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin, requireManager);

router.get('/summary', dashboard.summary);
router.get('/section', dashboard.section);

module.exports = router;
