const express = require('express');
const { authenticate } = require('../middleware/auth');
const blockController = require('../controllers/blockController');

const router = express.Router();

router.get('/', authenticate, blockController.getBlockedUsers);
router.post('/:userId', authenticate, blockController.blockUser);
router.delete('/:userId', authenticate, blockController.unblockUser);

module.exports = router;
