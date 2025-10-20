import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { userRegistrationSchema, userLoginSchema, UserResponseSchema, TokenResponseSchema } from '../schemas/user.schema.js';

const prisma = new PrismaClient();



const register = async (req, res) => {
  console.log('Request body:', req.body);
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

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export default {
  register,
  login,
  getMe,
};