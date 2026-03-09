const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/password', profileController.changePassword);

module.exports = router;