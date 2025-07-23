const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { validate } = require('../middlewares/validate.middleware');
const { addToCartSchema, updateCartSchema, removeFromCartSchema } = require('../schemas/cart.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Carrinho
 *   description: Operações relacionadas ao carrinho de compras do usuário.
 */

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Obtém o carrinho de compras do usuário
 *     tags: [Carrinho]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carrinho retornado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao obter o carrinho.
 */
router.get('/cart', auth, cartController.getCart);

/**
 * @swagger
 * /api/v1/cart/add:
 *   post:
 *     summary: Adiciona um item ao carrinho
 *     tags: [Carrinho]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCart'
 *     responses:
 *       201:
 *         description: Item adicionado com sucesso.
 *       400:
 *         description: Requisição inválida (e.g., estoque insuficiente).
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Produto não encontrado.
 */
router.post('/cart/add', auth, validate(addToCartSchema), cartController.addToCart);

/**
 * @swagger
 * /api/v1/cart/update:
 *   put:
 *     summary: Atualiza a quantidade de um item no carrinho
 *     tags: [Carrinho]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCart'
 *     responses:
 *       200:
 *         description: Item atualizado com sucesso.
 *       204:
 *         description: Item removido do carrinho (quantidade 0).
 *       400:
 *         description: Requisição inválida (e.g., estoque insuficiente).
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Item não encontrado no carrinho.
 */
router.put('/cart/update', auth, validate(updateCartSchema), cartController.updateCart);

/**
 * @swagger
 * /api/v1/cart/remove:
 *   delete:
 *     summary: Remove um item do carrinho
 *     tags: [Carrinho]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RemoveFromCart'
 *     responses:
 *       204:
 *         description: Item removido com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Item não encontrado no carrinho.
 */
router.delete('/cart/remove', auth, validate(removeFromCartSchema), cartController.removeFromCart);

module.exports = router;
