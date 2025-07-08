const { z } = require('zod');

const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome da organização precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome da organização' }),
    instanceId: z.string().openapi({ description: 'ID da instância' }),
  }).openapi({ description: 'Dados para criação de uma organização' }),
});

module.exports = {
  createOrganizationSchema,
};
