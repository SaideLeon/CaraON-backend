const { z } = require('zod');

const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome da organização precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome da organização' }),
  }).openapi({ description: 'Dados para criação de uma organização' }),
  params: z.object({
    instanceId: z.string().openapi({ description: 'ID da instância' }),
  }),
});

const listOrganizationsSchema = z.object({
  params: z.object({
    instanceId: z.string().openapi({ description: 'ID da instância para listar as organizações' }),
  }),
});

module.exports = {
  createOrganizationSchema,
  listOrganizationsSchema,
};
