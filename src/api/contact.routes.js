import express from 'express';
const router = express.Router();
import contactController from '../controllers/contact.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { listContactsSchema } from '../schemas/contact.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Contatos
 *   description: API para visualizar e gerenciar contatos de clientes.
 */

/**
 * @swagger
 * /api/v1/instances/{instanceId}/contacts:
 *   get:
 *     summary: Lista os contatos de uma instância
 *     tags: [Contatos]
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
 *         description: Lista de contatos.
 *       401:
 *         description: Não autorizado.
 */
router.get('/instances/:instanceId/contacts', auth, validate(listContactsSchema), contactController.listContacts);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/contacts/summary:
 *   get:
 *     summary: Obtém um resumo de contatos da instância
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância.
 *     responses:
 *       200:
 *         description: Resumo com o total de contatos e a lista de números.
 *       401:
 *         description: Não autorizado.
 */
router.get('/instances/:instanceId/contacts/summary', auth, validate(listContactsSchema), contactController.getContactSummary);


export default router;
