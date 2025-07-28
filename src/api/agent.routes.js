import express from 'express';
const router = express.Router();
import agentController from '../controllers/agent.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { 
    createAgentSchema, 
    listChildAgentsSchema, 
    updateAgentPersonaSchema, 
    exportAgentAnalyticsSchema, 
    getAgentByIdSchema, 
    listParentAgentsSchema, 
    deleteAgentSchema, 
    updateAgentSchema 
} from '../schemas/agent.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Agentes
 *   description: Gerenciamento da hierarquia e configuração de agentes de IA.
 */

// ========== Rotas de Hierarquia de Agentes ==========

/**
 * @swagger
 * /api/v1/agents:
 *   post:
 *     summary: Cria um novo Agente (ROUTER, PARENT, ou CHILD)
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentBody'
 *           examples:
 *             createRouter:
 *               summary: Criar um Agente Roteador
 *               value:
 *                 name: "Roteador Principal da Instância"
 *                 persona: "Eu sou o roteador principal. Direciono os clientes para o departamento correto."
 *                 type: "ROUTER"
 *                 instanceId: "60d0fe4f5311236168a109ca"
 *             createParent:
 *               summary: Criar um Agente Pai (Departamento)
 *               value:
 *                 name: "Departamento de Vendas"
 *                 persona: "Nós somos o departamento de vendas. Como podemos ajudar?"
 *                 type: "PARENT"
 *                 instanceId: "60d0fe4f5311236168a109ca"
 *                 organizationId: "60d0fe4f5311236168a109cb"
 *             createChild:
 *               summary: Criar um Agente Filho (Especialista)
 *               value:
 *                 name: "Especialista em iPhones"
 *                 persona: "Eu sou um especialista em iPhones. Posso ajudar com qualquer dúvida sobre eles."
 *                 type: "CHILD"
 *                 parentAgentId: "60d0fe4f5311236168a109cc"
 *                 toolIds: ["60d0fe4f5311236168a109cd"]
 *     responses:
 *       201:
 *         description: Agente criado com sucesso.
 *       400:
 *         description: Requisição inválida.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o agente.
 */
router.post('/', auth, validate(createAgentSchema), agentController.createAgent);


/**
 * @swagger
 * /api/v1/agents/parents/{instanceId}:
 *   get:
 *     summary: Lista os Agentes Pais e Roteadores de uma instância
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
 *         description: Lista de agentes.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os agentes.
 */
router.get('/parents/:instanceId', auth, validate(listParentAgentsSchema), agentController.listParentAgents);

/**
 * @swagger
 * /api/v1/agents/user/parents:
 *   get:
 *     summary: Lista todos os Agentes Pais e Roteadores de um usuário
 *     tags: [Agentes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agentes do usuário.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os agentes.
 */
router.get('/user/parents', auth, agentController.listUserParentAgents);


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


export default router;