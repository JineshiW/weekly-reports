const express = require('express');
const users = require('../controllers/userController');
const validateBody = require('../middleware/validateBody');
const { requireLogin, requireManager } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin, requireManager);

router.get('/', users.list);
router.post('/', validateBody(users.inviteSchema), users.invite);
router.get('/:id/profile', users.profile);
router.patch('/:id/role', validateBody(users.roleSchema), users.changeRole);
router.delete('/:id', users.deactivate);

module.exports = router;
