import express from 'express';
const router = express.Router();
import brandController from '../controllers/brand.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createBrandSchema, updateBrandSchema, listBrandsSchema } from '../schemas/brand.schema.js';
import auth from '../middlewares/auth.middleware.js';

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
 *           examples:
 *             apple:
 *               summary: Marca Apple
 *               value:
 *                 name: "Apple"
 *                 slug: "apple"
 *                 description: "Marca conhecida por seus iPhones, MacBooks e outros dispositivos eletrônicos de alta qualidade."
 *             samsung:
 *               summary: Marca Samsung
 *               value:
 *                 name: "Samsung"
 *                 slug: "samsung"
 *                 description: "Líder global em smartphones Android, televisores e outros eletrônicos."
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
 *           examples:
 *             updateXiaomi:
 *               summary: Atualizar Marca Xiaomi
 *               value:
 *                 name: "Xiaomi Inc."
 *                 description: "Fabricante chinesa de smartphones e outros produtos eletrônicos, conhecida por sua excelente relação custo-benefício."
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

export default router;
