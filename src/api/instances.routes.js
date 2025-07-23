const express = require('express');
const router = express.Router();
const instanceController = require('../controllers/instances.controller');
const { validate } = require('../middlewares/validate.middleware');
const { instanceActionSchema } = require('../schemas/instance.schema');
const auth = require('../middlewares/auth.middleware');

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
 *             example:
 *               - id: "inst_1"
 *                 name: "Instância Exemplo"
 *                 clientId: "client_1"
 *                 status: "CONNECTED"
 *                 userId: "user_1"
 *                 createdAt: "2025-07-21T12:00:00.000Z"
 *                 updatedAt: "2025-07-21T12:00:00.000Z"
 */

/**
 * @swagger
 * /api/v1/instances/{id}:
 *   get:
 *     summary: Obtém instância por ID
 *     tags:
 *       - Instâncias
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instância retornada
 *         content:
 *           application/json:
 *             example:
 *               id: "inst_1"
 *               name: "Instância Exemplo"
 *               clientId: "client_1"
 *               userId: "user_1"
 *               status: "PENDING_QR"
 *               createdAt: "2025-07-21T12:00:00.000Z"
 *               updatedAt: "2025-07-21T12:00:00.000Z"
 *       404:
 *         description: Instância não encontrada
 *         content:
 *           application/json:
 *             example:
 *               error: "Instância não encontrada."
 *   put:
 *     summary: Atualiza instância
 *     tags:
 *       - Instâncias
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               clientId:
 *                 type: string
 *               userId:
 *                 type: string
 *           required:
 *             - userId
 *           example:
 *             name: "Instância Atualizada"
 *             clientId: "client_2"
 *             userId: "user_2"
 *     responses:
 *       200:
 *         description: Instância atualizada
 *         content:
 *           application/json:
 *             example:
 *               id: "inst_1"
 *               name: "Instância Atualizada"
 *               clientId: "client_2"
 *               userId: "user_2"
 *               status: "ACTIVE"
 *               createdAt: "2025-07-21T12:00:00.000Z"
 *               updatedAt: "2025-07-21T12:10:00.000Z"
 *       404:
 *         description: Instância não encontrada
 *         content:
 *           application/json:
 *             example:
 *               error: "Instância não encontrada."
 *   delete:
 *     summary: Deleta instância
 *     tags:
 *       - Instâncias
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
 *         description: Instância deletada
 *       404:
 *         description: Instância não encontrada
 *         content:
 *           application/json:
 *             example:
 *               error: "Instância não encontrada."
 */

router.post('/new/instance', auth, instanceController.createInstance);
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
 *             example:
 *               message: "Reconexão iniciada. Aguarde o QR Code se necessário."
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
 *             example:
 *               message: "Instância desconectada com sucesso"
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
 *             example:
 *               status: "CONNECTED"
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao obter o status da instância.
 */
router.get('/instances/:instanceId/status', auth, validate(instanceActionSchema), instanceController.getInstanceStatus);

module.exports = router;
