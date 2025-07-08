const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { userRegistrationSchema, userLoginSchema } = require('../schemas/user.schema');

router.post('/register', validate(userRegistrationSchema), authController.register);
router.post('/login', validate(userLoginSchema), authController.login);

module.exports = router;
