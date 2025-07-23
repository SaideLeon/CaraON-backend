const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { userRegistrationSchema, userLoginSchema } = require('../schemas/user.schema');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegistration:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: O nome do usuário.
 *         email:
 *           type: string
 *           format: email
 *           description: O e-mail do usuário.
 *         password:
 *           type: string
 *           description: A senha do usuário (mínimo 6 caracteres).
 *       required:
 *         - name
 *         - email
 *         - password
 *     UserLogin:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: O e-mail do usuário.
 *         password:
 *           type: string
 *           description: A senha do usuário.
 *       required:
 *         - email
 *         - password
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: O ID do usuário.
 *         name:
 *           type: string
 *           description: O nome do usuário.
 *         email:
 *           type: string
 *           format: email
 *           description: O e-mail do usuário.
 *     TokenResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: O token JWT de autenticação.
 *         user:
 *           $ref: '#/components/schemas/UserResponse'
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
 *           examples:
 *             testUser:
 *               summary: Usuário de Teste
 *               value:
 *                 name: "Saíde Omar Saíde"
 *                 email: "saideomarsaideleon@gmail.com"
 *                 password: "Damasco12"
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
 *           examples:
 *             testUser:
 *               summary: Usuário de Teste
 *               value:
 *                 email: "saideomarsaideleon@gmail.com"
 *                 password: "Damasco12"
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

router.post('/register', validate(userRegistrationSchema), authController.register);
router.post('/login', validate(userLoginSchema), authController.login);

module.exports = router;
