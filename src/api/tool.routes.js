const express = require('express');
const router = express.Router();
const toolController = require('../controllers/tool.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createToolSchema, toolIdParamSchema } = require('../schemas/tool.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Ferramentas
 *   description: Gerenciamento de ferramentas personalizadas para agentes.
 */

/**
 * @swagger
 * /api/v1/tools:
 *   post:
 *     summary: Cria uma nova ferramenta personalizada
 *     tags: [Ferramentas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [DATABASE, API, WEBHOOK, GENKIT_FLOW, CUSTOM]
 *               config:
 *                 type: object
 *                 description: Configuração da ferramenta. Para `DATABASE`, especifica a busca de produtos no banco de dados real.
 *           examples:
 *             searchStock:
 *               summary: Ferramenta de Consulta de Estoque
 *               value:
 *                 name: "Consultar Estoque de Smartphone"
 *                 description: "Ferramenta para verificar a disponibilidade de um modelo de smartphone específico no banco de dados da TechCell."
 *                 type: "DATABASE"
 *                 config:
 *                   collection: "products"
 *                   query: "{\"name\": \"{smartphone_name}\", \"stock\": { \"$gt\": 0 }}"
 *             checkOrderStatus:
 *               summary: Ferramenta de Verificação de Pedido
 *               value:
 *                 name: "Verificar Status do Pedido"
 *                 description: "Ferramenta que se conecta à API de logística para rastrear o status de um pedido."
 *                 type: "API"
 *                 config:
 *                   url: "https://api.logistica.com/v1/tracking"
 *                   method: "POST"
 *                   headers: "{\"Authorization\": \"Bearer YOUR_API_KEY\"}"
 *                   body: "{\"orderId\": \"{order_id}\"}"
 *     responses:
 *       201:
 *         description: Ferramenta criada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar a ferramenta.
 */
router.post('/', auth, validate(createToolSchema), toolController.createTool);

/**
 * @swagger
 * /api/v1/tools:
 *   get:
 *     summary: Lista todas as ferramentas disponíveis
 *     tags: [Ferramentas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ferramentas.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar as ferramentas.
 */
router.get('/', auth, toolController.getTools);

/**
 * @swagger
 * /api/v1/tools/{toolId}:
 *   get:
 *     summary: Obtém uma ferramenta específica pelo ID
 *     tags: [Ferramentas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ferramenta retornada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Ferramenta não encontrada.
 */
router.get('/:toolId', auth, validate(toolIdParamSchema), toolController.getToolById);

module.exports = router;
