import express from 'express';
const router = express.Router();
import categoryController from '../controllers/category.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createCategorySchema, updateCategorySchema, listCategoriesSchema } from '../schemas/category.schema.js';
import auth from '../middlewares/auth.middleware.js';

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
 *           examples:
 *             smartphones:
 *               summary: Categoria Smartphones
 *               value:
 *                 name: "Smartphones"
 *                 slug: "smartphones"
 *                 description: "Todos os tipos de smartphones, dos modelos de entrada aos topo de linha."
 *             accessories:
 *               summary: Categoria Acessórios
 *               value:
 *                 name: "Acessórios"
 *                 slug: "acessorios"
 *                 description: "Capas, películas, carregadores, fones de ouvido e muito mais."
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
 *           examples:
 *             updateWearables:
 *               summary: Atualizar Categoria Wearables
 *               value:
 *                 name: "Wearables & Smartwatches"
 *                 slug: "wearables-smartwatches"
 *                 description: "Relógios inteligentes, pulseiras fitness e outros dispositivos vestíveis."
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

export default router;
