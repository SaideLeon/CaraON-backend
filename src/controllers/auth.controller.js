const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { registry } = require('../docs/openapi');
const { userRegistrationSchema, userLoginSchema } = require('../schemas/user.schema');

const prisma = new PrismaClient();

// Define response schemas for OpenAPI
const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const TokenResponseSchema = z.object({
  token: z.string(),
});

// Register route with OpenAPI
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Registra um novo usuário',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: userRegistrationSchema.shape.body,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Usuário criado com sucesso',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    400: {
      description: 'Dados de entrada inválidos',
    },
    409: {
        description: 'Email já em uso',
    }
  },
});

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true }, // Retorna apenas campos seguros
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Falha ao registrar o usuário.' });
  }
};

// Register route with OpenAPI
registry.registerPath({
    method: 'post',
    path: '/auth/login',
    summary: 'Autentica um usuário e retorna um token JWT',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: userLoginSchema.shape.body,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login bem-sucedido',
        content: {
          'application/json': {
            schema: TokenResponseSchema,
          },
        },
      },
      401: {
        description: 'Credenciais inválidas',
      },
      404: {
          description: 'Usuário não encontrado',
      },
    },
  });

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({ token });
};
