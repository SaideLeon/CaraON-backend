const { z } = require('zod');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

// Extende o Zod para suportar .openapi()
extendZodWithOpenApi(z);

const userRegistrationSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome do usuário' }),
    email: z.string().email('Email inválido.').openapi({ description: 'Email do usuário' }),
    password: z.string().min(6, 'A senha precisa ter no mínimo 6 caracteres.').openapi({ description: 'Senha do usuário' }),
  }).openapi({ description: 'Dados para registro de um novo usuário' }),
});

const userLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido.'),
    password: z.string(),
  }),
});

module.exports = {
  userRegistrationSchema,
  userLoginSchema,
};
