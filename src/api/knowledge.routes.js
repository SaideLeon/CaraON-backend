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
 * /api/v1/knowledge/upload-pdf/{organizationId}:
 *   post:
 *     summary: Upload de PDF para a base de conhecimento
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da organização.
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
router.post('/knowledge/upload-pdf/:organizationId', auth, upload.single('file'), validate(uploadPdfSchema), knowledgeController.uploadPdf);

export default router;
