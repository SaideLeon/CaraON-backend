import express from 'express';
import knowledgeController from '../controllers/knowledge.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { uploadPdfSchema } from '../schemas/knowledge.schema.js';
import auth from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Knowledge Base
 *   description: Gerenciamento da base de conhecimento.
 */

/**
 * @swagger
 * /api/v1/knowledge/upload-pdf/{userId}/{instanceId}:
 *   post:
 *     summary: Upload de PDF para a base de conhecimento
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do usuário.
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: PDF enviado com sucesso.
 *       400:
 *         description: Nenhum arquivo enviado.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Falha ao enviar o PDF.
 */
router.post('/upload-pdf/:userId/:instanceId', auth, upload.single('file'), validate(uploadPdfSchema), knowledgeController.uploadPdf);

export default router;
