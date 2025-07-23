const { z } = require('zod');

const brandSchema = z.object({
  name: z.string().min(2, 'O nome da marca deve ter pelo menos 2 caracteres.').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido.'),
  description: z.string().optional(),
});

const createBrandSchema = z.object({
  body: brandSchema,
});

const updateBrandSchema = z.object({
  body: brandSchema.partial(),
  params: z.object({
    id: z.string().uuid('ID de marca inválido.'),
  }),
});

const listBrandsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

module.exports = {
  createBrandSchema,
  updateBrandSchema,
  listBrandsSchema,
};
