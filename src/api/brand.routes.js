const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createBrandSchema, updateBrandSchema, listBrandsSchema } = require('../schemas/brand.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Marcas
 *   description: API para gerenciar marcas de produtos.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: O ID da marca (gerado automaticamente).
 *           readOnly: true
 *         name:
 *           type: string
 *           description: O nome da marca.
 *         slug:
 *           type: string
 *           description: O slug único para a URL da marca.
 *         description:
 *           type: string
 *           description: A descrição da marca.
 *       required:
 *         - name
 *         - slug
 */

/**
 * @swagger
 * /api/v1/brands:
 *   post:
 *     summary: Cria uma nova marca
 *     tags: [Marcas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Brand'
 *     responses:
 *       201:
 *         description: Marca criada com sucesso.
 *       400:
 *         description: Dados inválidos.
 *   get:
 *     summary: Lista todas as marcas
 *     tags: [Marcas]
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
 *         description: Lista de marcas.
 */

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   get:
 *     summary: Obtém uma marca pelo ID
 *     tags: [Marcas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marca encontrada.
 *       404:
 *         description: Marca não encontrada.
 *   put:
 *     summary: Atualiza uma marca
 *     tags: [Marcas]
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
 *             $ref: '#/components/schemas/Brand'
 *     responses:
 *       200:
 *         description: Marca atualizada com sucesso.
 *       404:
 *         description: Marca não encontrada.
 *   delete:
 *     summary: Deleta uma marca
 *     tags: [Marcas]
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
 *         description: Marca deletada com sucesso.
 *       404:
 *         description: Marca não encontrada.
 */

router.post('/brands', auth, validate(createBrandSchema), brandController.createBrand);
router.get('/brands', validate(listBrandsSchema), brandController.getBrands);
router.get('/brands/:id', brandController.getBrandById);
router.put('/brands/:id', auth, validate(updateBrandSchema), brandController.updateBrand);
router.delete('/brands/:id', auth, brandController.deleteBrand);

module.exports = router;
