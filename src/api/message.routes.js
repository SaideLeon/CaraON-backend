import express from 'express';
const router = express.Router();
import messageController from '../controllers/message.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { listMessagesSchema, deleteMessageSchema } from '../schemas/message.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Mensagens
 *   description: API para visualizar e gerenciar o histórico de mensagens.
 */

/**
 * @swagger
 * /api/v1/instances/{instanceId}/messages:
 *   get:
 *     summary: Lista as mensagens de uma instância
 *     tags: [Mensagens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância.
 *       - in: query
 *         name: contactId
 *         schema:
 *           type: string
 *         description: (Opcional) Filtra as mensagens por um contato específico.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de mensagens.
 *       401:
 *         description: Não autorizado.
 */
router.get('/instances/:instanceId/messages', auth, validate(listMessagesSchema), messageController.listMessages);

/**
 * @swagger
 * /api/v1/messages/{messageId}:
 *   delete:
 *     summary: Deleta uma mensagem específica
 *     tags: [Mensagens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da mensagem a ser deletada.
 *     responses:
 *       204:
 *         description: Mensagem deletada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Mensagem não encontrada.
 */
router.delete('/messages/:messageId', auth, validate(deleteMessageSchema), messageController.deleteMessage);


/**
 * @swagger
 * /api/v1/messages/with-contacts:
 *   get:
 *     summary: Lista todas as mensagens com informações de contato
 *     tags: [Mensagens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mensagens com contatos.
 *       401:
 *         description: Não autorizado.
 */
router.get('/messages/with-contacts', auth, messageController.listMessagesWithContacts);

export default router;
