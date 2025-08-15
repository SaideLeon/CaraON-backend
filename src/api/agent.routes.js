import express from 'express';
import agentController from '../controllers/agent.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { updateHierarchySchema, getSessionsSchema, getConversationSchema } from '../schemas/agent.schema.js';
import auth from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Agentes (Ariac)
 *   description: Gerenciamento de agentes de IA através do serviço Ariac.
 */

/**
 * @swagger
 * /api/v1/agents/hierarchy:
 *   put:
 *     summary: Configura a hierarquia de agentes para uma instância
 *     tags: [Agentes (Ariac)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateHierarchyBody'
 *     responses:
 *       200:
 *         description: Hierarquia de agentes configurada com sucesso.
 *       400:
 *         description: Requisição inválida.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao configurar a hierarquia.
 */
router.put('/hierarchy', auth, validate(updateHierarchySchema), agentController.updateHierarchy);

/**
 * @swagger
 * /api/v1/agents/instances:
 *   get:
 *     summary: Lista todas as configurações de agentes para o usuário autenticado
 *     tags: [Agentes (Ariac)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de instâncias de agentes retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 instances:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao buscar as instâncias.
 */
router.get('/instances', auth, agentController.getUserInstancesController);

/**
 * @swagger
 * /api/v1/agents/sessions:
 *   get:
 *     summary: Lista todas as sessões de conversa
 *     tags: [Agentes (Ariac)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: instance_id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância para filtrar as sessões.
 *       - in: query
 *         name: whatsapp_number
 *         schema:
 *           type: string
 *         description: (Opcional) O número do WhatsApp (session_id) para filtrar as sessões.
 *     responses:
 *       200:
 *         description: Lista de sessões retornada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao buscar as sessões.
 */
router.get('/sessions', auth, validate(getSessionsSchema), agentController.getSessionsController);

/**
 * @swagger
 * /api/v1/agents/sessions/{session_id}/conversation:
 *   get:
 *     summary: Obtém o histórico de mensagens de uma sessão
 *     tags: [Agentes (Ariac)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da sessão (número do WhatsApp).
 *     responses:
 *       200:
 *         description: Histórico da conversa retornado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao buscar a conversa.
 */
router.get('/sessions/:session_id/conversation', auth, validate(getConversationSchema), agentController.getConversationController);

export default router;
