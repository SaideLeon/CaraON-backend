const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createCategorySchema, updateCategorySchema, listCategoriesSchema } = require('../schemas/category.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Categorias
 *   description: API para gerenciar categorias de produtos.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: O ID da categoria (gerado automaticamente).
 *           readOnly: true
 *         name:
 *           type: string
 *           description: O nome da categoria.
 *         slug:
 *           type: string
 *           description: O slug único para a URL da categoria.
 *         description:
 *           type: string
 *           description: A descrição da categoria.
 *       required:
 *         - name
 *         - slug
 */

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Cria uma nova categoria
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso.
 *       400:
 *         description: Dados inválidos.
 *   get:
 *     summary: Lista todas as categorias
 *     tags: [Categorias]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de categorias.
 */

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Obtém uma categoria pelo ID
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoria encontrada.
 *       404:
 *         description: Categoria não encontrada.
 *   put:
 *     summary: Atualiza uma categoria
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso.
 *       404:
 *         description: Categoria não encontrada.
 *   delete:
 *     summary: Deleta uma categoria
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Categoria deletada com sucesso.
 *       404:
 *         description: Categoria não encontrada.
 */

router.post('/categories', auth, validate(createCategorySchema), categoryController.createCategory);
router.get('/categories', validate(listCategoriesSchema), categoryController.getCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.put('/categories/:id', auth, validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/categories/:id', auth, categoryController.deleteCategory);

module.exports = router;
