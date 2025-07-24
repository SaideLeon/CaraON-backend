const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createTemplateSchema, updateTemplateSchema, templateIdParamSchema } = require('../schemas/template.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Gerenciamento de templates de agentes.
 */

/**
 * @swagger
 * /api/v1/templates:
 *   post:
 *     summary: Cria um novo template de agente
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTemplate'
 *           examples:
 *             salesTemplate:
 *               summary: Template de Agente de Vendas
 *               value:
 *                 name: "Agente de Vendas de Smartphones"
 *                 description: "Um agente especializado em vender smartphones, conhecendo todos os modelos, especificações e promoções."
 *                 category: "Vendas"
 *                 defaultPersona: "Você é um vendedor especialista em smartphones da TechCell. Seu objetivo é entender a necessidade do cliente e recomendar o melhor aparelho, destacando seus benefícios e fechando a venda."
 *             supportTemplate:
 *               summary: Template de Agente de Suporte
 *               value:
 *                 name: "Agente de Suporte Técnico de Smartphones"
 *                 description: "Um agente treinado para resolver problemas técnicos comuns em smartphones."
 *                 category: "Suporte"
 *                 defaultPersona: "Você é um especialista de suporte técnico da TechCell. Sua missão é ajudar os clientes a resolverem problemas com seus aparelhos de forma rápida e eficiente, garantindo a satisfação do cliente."
 * 
 *     responses:
 *       201:
 *         description: Template criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o template.
 */
router.post('/', auth, validate(createTemplateSchema), templateController.createTemplate);

/**
 * @swagger
 * /api/v1/templates:
 *   get:
 *     summary: Lista todos os templates disponíveis
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de templates.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os templates.
 */
router.get('/', auth, templateController.getTemplates);

/**
 * @swagger
 * /api/v1/templates/{templateId}:
 *   get:
 *     summary: Obtém um template específico pelo ID
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retornado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Template não encontrado.
 */
router.get('/:templateId', auth, validate(templateIdParamSchema), templateController.getTemplateById);

/**
 * @swagger
 * /api/v1/templates/{templateId}:
 *   put:
 *     summary: Atualiza um template existente
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTemplate'
 *           examples:
 *             updateSalesTemplate:
 *               summary: Atualizar Template de Vendas
 *               value:
 *                 name: "Agente Especialista em iPhone"
 *                 description: "Um agente focado exclusivamente em vender iPhones, com conhecimento profundo de todo o ecossistema Apple."
 *                 category: "Vendas"
 *                 defaultPersona: "Você é o maior especialista em iPhones da TechCell. Você conhece cada detalhe, desde a primeira geração até os últimos lançamentos. Sua paixão pela Apple é contagiante e você a usa para mostrar aos clientes porque o iPhone é a melhor escolha."
 * 
 *     responses:
 *       200:
 *         description: Template atualizado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Template não encontrado.
 *       500:
 *         description: Falha ao atualizar o template.
 */
router.put('/:templateId', auth, validate(updateTemplateSchema), templateController.updateTemplate);

/**
 * @swagger
 * /api/v1/templates/{templateId}:
 *   delete:
 *     summary: Deleta um template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Template deletado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Template não encontrado.
 */
router.delete('/:templateId', auth, validate(templateIdParamSchema), templateController.deleteTemplate);

module.exports = router;