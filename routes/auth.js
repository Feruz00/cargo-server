const { currentUser, logoutUser, loginUser } = require('../controller/auth');
const { protect } = require('../middleware/auth');
const authRateLimiter = require('../middleware/rate-limitter');

const router = require('express').Router();

router.get('/', protect, currentUser);
router.post('/login', authRateLimiter, loginUser);
router.post('/logout', logoutUser);

module.exports = router;
