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
 *             databaseExample:
 *               summary: Exemplo de Ferramenta de Banco de Dados
 *               value:
 *                 name: "Busca de Produtos"
 *                 description: "Ferramenta para buscar produtos no banco de dados da loja."
 *                 type: "DATABASE"
 *                 config:
 *                   connectionString: "mongodb://root:LeonardaSumila12@129.146.70.15:5435/caraon_db?authSource=admin&directConnection=true"
 *                   collection: "products"
 *                   query: "{\"name\": \"{product_name}\"}"
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
