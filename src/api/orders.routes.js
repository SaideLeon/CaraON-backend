import express from 'express';
const router = express.Router();
import orderController from '../controllers/orders.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Pedidos
 *   description: Operações relacionadas a pedidos.
 */

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Cria um novo pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrder'
 *           examples:
 *             newPhoneOrder:
 *               summary: Novo Pedido de Smartphone
 *               value:
 *                 cartId: "cart_abc123"
 *                 shippingAddress: "Rua das Flores, 123, São Paulo, SP, 01234-567"
 *                 shippingMethod: "SEDEX"
 *                 paymentMethod: "CREDIT_CARD"
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao criar o pedido.
 */
router.post('/orders', auth, validate(createOrderSchema), orderController.createOrder);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Lista todos os pedidos do usuário
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao listar os pedidos.
 */
router.get('/orders', auth, orderController.listOrders);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Obtém um pedido pelo ID
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do pedido.
 *     responses:
 *       200:
 *         description: Pedido retornado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Pedido não encontrado.
 *       500:
 *         description: Falha ao obter o pedido.
 */
router.get('/orders/:id', auth, orderController.getOrderById);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Atualiza o status de um pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do pedido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELED, RETURNED, REFUNDED]
 *                 example: "SHIPPED"
 *     responses:
 *       200:
 *         description: Status do pedido atualizado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Pedido não encontrado.
 *       500:
 *         description: Falha ao atualizar o status do pedido.
 */
router.patch('/orders/:id/status', auth, validate(updateOrderStatusSchema), orderController.updateOrderStatus);

/**
 * @swagger
 * /api/v1/orders/payment-notification:
 *   post:
 *     summary: Recebe notificações de pagamento de provedores externos (Webhook)
 *     tags: [Pedidos]
 *     description: 'Endpoint para receber webhooks de provedores de pagamento (ex: M-Pesa, M-Mola, Stripe). Não requer autenticação, pois a segurança é baseada na validação da origem da notificação (não implementado neste exemplo).'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: O ID da transação do provedor.
 *               status:
 *                 type: string
 *                 enum: [PAID, FAILED, CANCELED]
 *                 description: O status final da transação.
 *               provider:
 *                 type: string
 *                 description: 'O nome do provedor de pagamento (ex: mpesa, mmola).'
 *               amount:
 *                 type: number
 *                 description: O valor da transação.
 *             example:
 *               transactionId: "qwerty12345"
 *               status: "PAID"
 *               provider: "mpesa"
 *               amount: 2500.50
 *     responses:
 *       200:
 *         description: Notificação processada com sucesso.
 *       500:
 *         description: Erro ao processar a notificação.
 */
router.post('/orders/payment-notification', orderController.handlePaymentNotification);

export default router;