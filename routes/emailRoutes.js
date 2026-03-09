const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const emailController = require('../controllers/emailController');
const { emailLimiter } = require('../middleware/rateLimiter');

router.use(authMiddleware);

router.post('/send', emailLimiter, emailController.send);
router.get('/history/:sessionId', emailController.getHistory);
router.post('/resend/:historyId', emailController.resend);

module.exports = router;