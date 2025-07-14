const express = require('express');
const router = express.Router();
const instanceController = require('../controllers/instances.controller');
const { validate } = require('../middlewares/validate.middleware');
const { instanceActionSchema } = require('../schemas/instance.schema');
const auth = require('../middlewares/auth.middleware');

router.post('/new/instance', auth, instanceController.createInstance);
router.get('/user/instances', auth, instanceController.listInstances);

router.post('/instances/:instanceId/reconnect', auth, validate(instanceActionSchema), instanceController.reconnectInstance);
router.post('/instances/:instanceId/disconnect', auth, validate(instanceActionSchema), instanceController.disconnectInstance);
router.get('/instances/:instanceId/status', auth, validate(instanceActionSchema), instanceController.getInstanceStatus);

module.exports = router;
