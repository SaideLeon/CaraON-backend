const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createParentAgentSchema, createChildAgentFromTemplateSchema, createCustomChildAgentSchema, listChildAgentsSchema, updateAgentPersonaSchema, exportAgentAnalyticsSchema, getAgentByIdSchema, listParentAgentsSchema } = require('../schemas/agent.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     CreateParentAgentBody:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: O nome do agente pai.
 *         persona:
 *           type: string
 *           description: A persona (personalidade e instruções) do agente.
 *       required:
 *         - name
 *         - persona
 *     CreateChildAgentFromTemplateBody:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: O nome do agente filho.
 *         templateId:
 *           type: string
 *           description: O ID do template a ser usado.
 *         customPersona:
 *           type: string
 *           description: (Opcional) Uma persona customizada para sobrescrever a do template.
 *       required:
 *         - name
 *         - templateId
 *     CreateCustomChildAgentBody:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: O nome do agente filho.
 *         persona:
 *           type: string
 *           description: A persona (personalidade e instruções) do agente.
 *         toolIds:
 *           type: array
 *           items:
 *             type: string
 *           description: (Opcional) Lista de IDs das ferramentas a serem associadas.
 *       required:
 *         - name
 *         - persona
 *     UpdateAgentPersonaBody:
 *       type: object
 *       properties:
 *         persona:
 *           type: string
 *           description: A nova persona do agente.
 *       required:
 *         - persona
 *
 * tags:
 *   name: Agentes
 *   description: Gerenciamento da hierarquia e configuração de agentes de IA.
 */

/**
 * @swagger
 * /api/v1/agents/parent/{instanceId}:
 *   post:
 *     summary: Cria um novo Agente Pai para uma instância
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância à qual o agente pertencerá.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateParentAgentBody'
 *     responses:
 *       201:
 *         description: Agente pai criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o agente pai.
 */

/**
 * @swagger
 * /api/v1/agents/parent/{instanceId}/{organizationId}:
 *   post:
 *     summary: Cria um novo Agente Pai para uma organização
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância à qual o agente pertencerá.
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da organização à qual o agente pertencerá.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateParentAgentBody'
 *     responses:
 *       201:
 *         description: Agente pai criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o agente pai.
 */

/**
 * @swagger
 * /api/v1/agents/child/from-template/{parentAgentId}:
 *   post:
 *     summary: Cria um Agente Filho a partir de um template
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentAgentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente pai.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChildAgentFromTemplateBody'
 *     responses:
 *       201:
 *         description: Agente filho criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Agente pai não encontrado.
 *       500:
 *         description: Falha ao criar o agente filho.
 */

/**
 * @swagger
 * /api/v1/agents/child/custom/{parentAgentId}:
 *   post:
 *     summary: Cria um Agente Filho customizado
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentAgentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente pai.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomChildAgentBody'
 *     responses:
 *       201:
 *         description: Agente filho criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Agente pai não encontrado.
 *       500:
 *         description: Falha ao criar o agente filho.
 */

/**
 * @swagger
 * /api/v1/agents/child/{parentAgentId}:
 *   get:
 *     summary: Lista os Agentes Filhos de um Agente Pai
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentAgentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente pai.
 *     responses:
 *       200:
 *         description: Lista de agentes filhos.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os agentes filhos.
 */

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   get:
 *     summary: Obtém um agente pelo seu ID
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente.
 *     responses:
 *       200:
 *         description: Agente retornado com sucesso.
 *       404:
 *         description: Agente não encontrado.
 *       500:
 *         description: Falha ao obter o agente.
 */

/**
 * @swagger
 * /api/v1/agents/{agentId}/persona:
 *   patch:
 *     summary: Atualiza a persona de um agente
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente a ser atualizado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAgentPersonaBody'
 *     responses:
 *       200:
 *         description: Persona do agente atualizada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Agente não encontrado.
 *       500:
 *         description: Falha ao atualizar a persona do agente.
 */

/**
 * @swagger
 * /api/v1/agents/analytics/export:
 *   get:
 *     summary: Exporta a análise de performance dos agentes em JSON
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância para a qual a análise será gerada.
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: (Opcional) O ID da organização para filtrar a análise.
 *     responses:
 *       200:
 *         description: Relatório de análise em JSON.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao exportar a análise.
 */

/**
 * @swagger
 * /api/v1/agents/analytics/export/csv:
 *   get:
 *     summary: Exporta a análise de performance dos agentes em CSV
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância para a qual a análise será gerada.
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: (Opcional) O ID da organização para filtrar a análise.
 *     responses:
 *       200:
 *         description: Arquivo CSV com a análise de performance dos agentes.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao exportar a análise em CSV.
 */

// Rotas para Análise de Agentes
router.get('/agents/analytics/export', auth, validate(exportAgentAnalyticsSchema), agentController.exportAgentAnalytics);
router.get('/agents/analytics/export/csv', auth, validate(exportAgentAnalyticsSchema), agentController.exportAgentAnalyticsCsv);

// Rotas para Hierarquia de Agentes
router.post('/agents/parent/:instanceId', auth, validate(createParentAgentSchema), agentController.createParentAgent);
router.post('/agents/parent/:instanceId/:organizationId', auth, validate(createParentAgentSchema), agentController.createParentAgent);

/**
 * @swagger
 * /api/v1/agents/parent/{instanceId}:
 *   get:
 *     summary: Lista os Agentes Pais de uma instância
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância.
 *     responses:
 *       200:
 *         description: Lista de agentes pais.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os agentes pais.
 */
router.get('/agents/parent/:instanceId', auth, validate(listParentAgentsSchema), agentController.listParentAgents);

/**
 * @swagger
 * /api/v1/agents/user/parents:
 *   get:
 *     summary: Lista todos os Agentes Pais de um usuário
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agentes pais do usuário.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os agentes pais.
 */
router.get('/agents/user/parents', auth, agentController.listUserParentAgents);


router.post('/agents/child/from-template/:parentAgentId', auth, validate(createChildAgentFromTemplateSchema), agentController.createChildAgentFromTemplate);
router.post('/agents/child/custom/:parentAgentId', auth, validate(createCustomChildAgentSchema), agentController.createCustomChildAgent);
router.get('/agents/child/:parentAgentId', auth, validate(listChildAgentsSchema), agentController.listChildAgents);
router.patch('/agents/:agentId/persona', auth, validate(updateAgentPersonaSchema), agentController.updateAgentPersona);
router.get('/agents/:agentId', auth, validate(getAgentByIdSchema), agentController.getAgentById);


module.exports = router;