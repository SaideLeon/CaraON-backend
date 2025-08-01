import express from 'express';
const router = express.Router();
import instanceController from '../controllers/instances.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { instanceActionSchema, createInstanceSchema } from '../schemas/instance.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
 
/**
 * @swagger
 * /api/v1/new/instance:
 *   post:
 *     summary: Cria uma nova instância de WhatsApp
 *     tags:
 *       - Instâncias
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
 *                 description: Um nome para identificar a instância.
 *             required:
 *               - name
 *             example:
 *               name: "Meu WhatsApp Pessoal"
 *     responses:
 *       201:
 *         description: Instância criada com sucesso. O cliente deve aguardar um evento WebSocket com o QR Code.
 *         content:
 *           application/json:
 *             example:
 *               message: "Instância criada com sucesso. Aguarde o QR Code via WebSocket."
 *               instance:
 *                 id: "687d71b2d76876633ed76318"
 *                 name: "Meu WhatsApp Pessoal"
 *                 clientId: "686d61414f384abecb506552-1753051570344"
 *                 status: "PENDING_QR"
 *                 userId: "686d61414f384abecb506552"
 *       500:
 *         description: Falha ao criar a instância.
 *
 * /api/v1/user/instances:
 *   get:
 *     summary: Lista todas as instâncias do usuário autenticado
 *     tags:
 *       - Instâncias
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de instâncias do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Instance'
 *             examples:
 *               techCellInstances:
 *                 summary: Instâncias da TechCell
 *                 value:
 *                   - id: "inst_12345"
 *                     name: "WhatsApp Vendas - TechCell"
 *                     clientId: "techcell-vendas-123"
 *                     status: "CONNECTED"
 *                     userId: "user_abcde"
 *                     createdAt: "2025-07-23T10:00:00.000Z"
 *                     updatedAt: "2025-07-23T18:30:00.000Z"
 *                   - id: "inst_67890"
 *                     name: "WhatsApp Suporte - TechCell"
 *                     clientId: "techcell-suporte-456"
 *                     status: "PENDING_QR"
 *                     userId: "user_abcde"
 *                     createdAt: "2025-07-22T15:00:00.000Z"
 *                     updatedAt: "2025-07-22T15:00:00.000Z"
 */

router.post('/new/instance', auth, validate(createInstanceSchema), instanceController.createInstance);
router.get('/user/instances', auth, instanceController.listInstances);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/reconnect:
 *   post:
 *     summary: Tenta reconectar uma instância de WhatsApp
 *     tags: [Instâncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância a ser reconectada.
 *     responses:
 *       200:
 *         description: Solicitação de reconexão bem-sucedida.
 *         content:
 *           application/json:
 *             examples:
 *               reconnectSuccess:
 *                 summary: Reconexão bem-sucedida
 *                 value:
 *                   message: "Reconexão iniciada para a instância de Vendas. Aguarde o QR Code se necessário."
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao reconectar a instância.
 */
router.post('/instances/:instanceId/reconnect', auth, validate(instanceActionSchema), instanceController.reconnectInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/disconnect:
 *   post:
 *     summary: Desconecta uma instância de WhatsApp
 *     tags: [Instâncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância a ser desconectada.
 *     responses:
 *       200:
 *         description: Instância desconectada com sucesso.
 *         content:
 *           application/json:
 *             examples:
 *               disconnectSuccess:
 *                 summary: Desconexão bem-sucedida
 *                 value:
 *                   message: "Instância de Vendas desconectada com sucesso"
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada ou não estava ativa.
 *       500:
 *         description: Falha ao desconectar a instância.
 */
router.post('/instances/:instanceId/disconnect', auth, validate(instanceActionSchema), instanceController.disconnectInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/status:
 *   get:
 *     summary: Obtém o status de uma instância de WhatsApp
 *     tags: [Instâncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância para verificar o status.
 *     responses:
 *       200:
 *         description: Status da instância retornado com sucesso.
 *         content:
 *           application/json:
 *             examples:
 *               statusConnected:
 *                 summary: Status Conectado
 *                 value:
 *                   status: "CONNECTED"
 *               statusPendingQR:
 *                 summary: Status Aguardando QR Code
 *                 value:
 *                   status: "PENDING_QR"
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao obter o status da instância.
 */
router.get('/instances/:instanceId/status', auth, validate(instanceActionSchema), instanceController.getInstanceStatus);

/**
 * @swagger
 * /api/v1/instances/{instanceId}:
 *   delete:
 *     summary: Deleta uma instância de WhatsApp
 *     tags: [Instâncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância a ser deletada.
 *     responses:
 *       204:
 *         description: Instância deletada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao deletar a instância.
 */
router.delete('/instances/:instanceId', auth, validate(instanceActionSchema), instanceController.deleteInstance);


export default router;