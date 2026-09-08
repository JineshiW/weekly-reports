const express = require('express');
const projects = require('../controllers/projectController');
const validateBody = require('../middleware/validateBody');
const { requireLogin, requireManager } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

router.get('/', projects.list);
router.post('/', requireManager, validateBody(projects.projectSchema), projects.create);
router.put('/:id', requireManager, validateBody(projects.projectSchema), projects.update);
router.delete('/:id', requireManager, projects.remove);

module.exports = router;
