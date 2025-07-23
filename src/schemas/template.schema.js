const { z } = require('zod');

const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome do template é obrigatório.'),
    description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
    category: z.string().min(3, 'A categoria é obrigatória.'),
    defaultPersona: z.string().min(20, 'A persona padrão precisa ter no mínimo 20 caracteres.'),
    toolIds: z.array(z.string()).optional().default([]),
  }),
});

const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome do template é obrigatório.').optional(),
    description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.').optional(),
    category: z.string().min(3, 'A categoria é obrigatória.').optional(),
    defaultPersona: z.string().min(20, 'A persona padrão precisa ter no mínimo 20 caracteres.').optional(),
    toolIds: z.array(z.string()).optional(),
  }),
  params: z.object({
    templateId: z.string(),
  }),
});

const templateIdParamSchema = z.object({
  params: z.object({
    templateId: z.string(),
  }),
});

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema,
};
