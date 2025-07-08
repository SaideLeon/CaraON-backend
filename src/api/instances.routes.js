const express = require('express');
const router = express.Router();
const instanceController = require('../controllers/instances.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/new/instance', auth, instanceController.createInstance);
router.get('/user/instances', auth, instanceController.listInstances);

module.exports = router;
