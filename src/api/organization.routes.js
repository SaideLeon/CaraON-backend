const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createOrganizationSchema } = require('../schemas/organization.schema');
const auth = require('../middlewares/auth.middleware');

router.post(
    '/instances/:instanceId/organizations',
    auth,
    validate(createOrganizationSchema),
    organizationController.createOrganization
);

module.exports = router;
