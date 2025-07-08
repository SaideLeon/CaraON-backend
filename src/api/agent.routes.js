const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createAgentSchema, updateAgentPersonaSchema } = require('../schemas/agent.schema');
const auth = require('../middlewares/auth.middleware');

router.post('/agents', auth, validate(createAgentSchema), agentController.createAgent);
router.patch('/agents/:agentId/persona', auth, validate(updateAgentPersonaSchema), agentController.updateAgentPersona);

module.exports = router;
