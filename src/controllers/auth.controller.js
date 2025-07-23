const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
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
  user: UserResponseSchema,
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

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
};
