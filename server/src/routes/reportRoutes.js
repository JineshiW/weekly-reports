const express = require('express');
const reports = require('../controllers/reportController');
const validateBody = require('../middleware/validateBody');
const { requireLogin, requireManager } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

router.get('/', reports.list);
router.post('/', validateBody(reports.reportSchema), reports.create);
router.get('/:id', reports.getOne);
router.get('/:id/versions', reports.versions);
router.put('/:id', validateBody(reports.reportSchema), reports.update);
router.post('/:id/submit', reports.submit);
router.post('/:id/review', requireManager, validateBody(reports.reviewSchema), reports.review);
router.delete('/:id', reports.removeDraft);

module.exports = router;
