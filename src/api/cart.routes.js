import express from 'express';
const router = express.Router();
import cartController from '../controllers/cart.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { addToCartSchema, updateCartSchema, removeFromCartSchema } from '../schemas/cart.schema.js';
import auth from '../middlewares/auth.middleware.js';

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
 *           examples:
 *             addIphone15:
 *               summary: Adicionar iPhone 15 ao Carrinho
 *               value:
 *                 productId: "clxkz5f2q0004i8uhc7a2g6h3"
 *                 quantity: 1
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
 *           examples:
 *             updateQuantity:
 *               summary: Atualizar Quantidade no Carrinho
 *               value:
 *                 cartItemId: "cart_item_xyz"
 *                 quantity: 2
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
 *           examples:
 *             removeItem:
 *               summary: Remover Item do Carrinho
 *               value:
 *                 cartItemId: "cart_item_xyz"
 *     responses:
 *       204:
 *         description: Item removido com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Item não encontrado no carrinho.
 */
router.delete('/cart/remove', auth, validate(removeFromCartSchema), cartController.removeFromCart);

export default router;
