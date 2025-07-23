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
 *             default:
 *               summary: Exemplo de criação de Template
 *               value:
 *                 name: "Gestor de Recursos Humanos"
 *                 description: "Um agente que gerencia recursos humanos da empresa."
 *                 category: "Gerencia"
 *                 defaultPersona: "Você é um especialista em recursos humanos. Sua função é gerenciar o bem-estar dos funcionários e resolver conflitos."
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
 *             default:
 *               summary: Exemplo de Atualização de Template
 *               value:
 *                 name: "Gestor de Marketing"
 *                 description: "Um agente que gerencia marketing da empresa."
 *                 category: "Gerencia"
 *                 defaultPersona: "Você é um especialista em marketing. Sua função monitorar o desempenho do funil de venda."
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