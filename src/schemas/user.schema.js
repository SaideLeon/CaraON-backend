const { z } = require('zod');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

// Extende o Zod para suportar .openapi()
extendZodWithOpenApi(z);

const userRegistrationSchema = z.object({
  body: z.object({
    name: z.string().openapi({ description: 'Nome do usuário' }).min(3, 'O nome precisa ter no mínimo 3 caracteres.'),
    email: z.string().openapi({ description: 'Email do usuário' }).email('Email inválido.'),
    password: z.string().openapi({ description: 'Senha do usuário' }).min(6, 'A senha precisa ter no mínimo 6 caracteres.'),
  }).openapi({ description: 'Dados para registro de um novo usuário' }),
});

const userLoginSchema = z.object({
  body: z.object({
    email: z.string().openapi({ description: 'Email do usuário' }).email('Email inválido.'),
    password: z.string().openapi({ description: 'Senha do usuário' }),
  }).openapi({ description: 'Dados para login do usuário' }),
});

module.exports = {
  userRegistrationSchema,
  userLoginSchema,
};
