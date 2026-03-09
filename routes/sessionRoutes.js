const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const sessionController = require('../controllers/sessionController');

router.use(authMiddleware); // all session routes protected

router.get('/', sessionController.getAll);
router.get('/:id', sessionController.getOne);
router.post('/', sessionController.create);
router.put('/:id', sessionController.update);
router.delete('/:id', sessionController.delete);

module.exports = router;