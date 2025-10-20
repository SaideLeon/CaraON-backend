import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js'; 
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints para registro e login de usuários.
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Realiza o registro de um novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       409:
 *         description: O e-mail fornecido já está em uso.
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Realiza o login de um usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login bem-sucedido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Credenciais inválidas.
 *       404:
 *         description: Usuário não encontrado.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Usuário não encontrado.
 */
router.get('/me', auth, authController.getMe);

export default router;