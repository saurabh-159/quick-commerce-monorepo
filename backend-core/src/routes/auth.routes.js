const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', protect, authController.getMe);

module.exports = router;