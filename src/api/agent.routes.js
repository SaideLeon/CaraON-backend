const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createParentAgentSchema, createChildAgentFromTemplateSchema, createCustomChildAgentSchema, listChildAgentsSchema, updateAgentPersonaSchema, exportAgentAnalyticsSchema, getAgentByIdSchema, listParentAgentsSchema, deleteAgentSchema, updateAgentSchema } = require('../schemas/agent.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Agentes
 *   description: Gerenciamento da hierarquia e configuração de agentes de IA.
 */

// ========== Rotas de Hierarquia de Agentes ==========

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
 *           examples:
 *             techStoreAgent:
 *               summary: Agente para Loja de Celulares
 *               value:
 *                 name: "Agente Principal - TechCell"
 *                 persona: "Você é o agente principal da TechCell, uma loja especializada em smartphones. Sua função é direcionar os clientes para o departamento correto (Vendas, Suporte, etc.) e responder a perguntas gerais sobre a loja."
 *     responses:
 *       201:
 *         description: Agente pai criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o agente pai.
 */
router.post('/parent/:instanceId', auth, validate(createParentAgentSchema), agentController.createParentAgent);

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
 *           examples:
 *             techStoreOrgAgent:
 *               summary: Agente para Departamento de Vendas
 *               value:
 *                 name: "Agente de Vendas - TechCell"
 *                 persona: "Você é um agente do departamento de vendas da TechCell. Sua função é ajudar os clientes a escolher o smartphone ideal, fornecer informações sobre preços, promoções e fechar vendas."
 *     responses:
 *       201:
 *         description: Agente pai criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o agente pai.
 */
router.post('/parent/:instanceId/:organizationId', auth, validate(createParentAgentSchema), agentController.createParentAgent);

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
router.get('/parent/:instanceId', auth, validate(listParentAgentsSchema), agentController.listParentAgents);

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
router.get('/user/parents', auth, agentController.listUserParentAgents);

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
 *           examples:
 *             supportAgent:
 *               summary: Agente de Suporte Técnico
 *               value:
 *                 templateId: "clxkz2x1y0000i8uh7b2g5f5e"
 *                 name: "Suporte Técnico - TechCell"
 *                 persona: "Você é um especialista de suporte técnico da TechCell. Ajude os clientes a resolver problemas com seus smartphones, como configurações, bugs ou reparos."
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
router.post('/child/from-template/:parentAgentId', auth, validate(createChildAgentFromTemplateSchema), agentController.createChildAgentFromTemplate);

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
 *           examples:
 *             financeAgent:
 *               summary: Agente Financeiro Personalizado
 *               value:
 *                 name: "Financeiro - TechCell"
 *                 persona: "Você é o agente do departamento financeiro da TechCell. Sua função é lidar com pagamentos, faturamento e questões de crédito para a compra de smartphones."
 *                 flow: '{"steps":["Verificar crédito", "Processar pagamento", "Enviar fatura"]}'
 *                 tools: ["clxkz5f2q0004i8uhc7a2g6h3"]
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
router.post('/child/custom/:parentAgentId', auth, validate(createCustomChildAgentSchema), agentController.createCustomChildAgent);

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
router.get('/child/:parentAgentId', auth, validate(listChildAgentsSchema), agentController.listChildAgents);

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
router.get('/:agentId', auth, validate(getAgentByIdSchema), agentController.getAgentById);

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   put:
 *     summary: Atualiza um agente existente (nome, persona, prioridade)
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
 *             $ref: '#/components/schemas/UpdateAgentBody'
 *           examples:
 *             setHighPriority:
 *               summary: Definir Agente como Principal
 *               value:
 *                 priority: 10
 *     responses:
 *       200:
 *         description: Agente atualizado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Agente não encontrado.
 *       500:
 *         description: Falha ao atualizar o agente.
 */
router.put('/:agentId', auth, validate(updateAgentSchema), agentController.updateAgent);

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   delete:
 *     summary: Deleta um agente
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do agente a ser deletado.
 *     responses:
 *       204:
 *         description: Agente deletado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Agente não encontrado.
 *       500:
 *         description: Falha ao deletar o agente.
 */
router.delete('/:agentId', auth, validate(deleteAgentSchema), agentController.deleteAgent);


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
 *           examples:
 *             updateSalesAgentPersona:
 *               summary: Atualizar Persona do Agente de Vendas
 *               value:
 *                 persona: "Você é o gerente de vendas da TechCell. Sua nova função é, além de vender, treinar novos vendedores e gerenciar as metas da equipe. Você agora tem um tom mais estratégico e motivacional."
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
router.patch('/:agentId/persona', auth, validate(updateAgentPersonaSchema), agentController.updateAgentPersona);


// ========== Rotas de Análise de Agentes ==========

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
router.get('/analytics/export', auth, validate(exportAgentAnalyticsSchema), agentController.exportAgentAnalytics);

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
router.get('/analytics/export/csv', auth, validate(exportAgentAnalyticsSchema), agentController.exportAgentAnalyticsCsv);


module.exports = router;