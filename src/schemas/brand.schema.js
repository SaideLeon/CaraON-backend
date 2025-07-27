const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const BrandSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'O nome da marca deve ter pelo menos 2 caracteres.').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido.'),
  description: z.string().optional(),
}).openapi({refId: 'Brand'});

const createBrandSchema = z.object({
  body: BrandSchema.omit({ id: true }),
});

const updateBrandSchema = z.object({
  body: BrandSchema.omit({ id: true }).partial(),
  params: z.object({
    id: z.string(),
  }),
});

const listBrandsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

registry.register('Brand', BrandSchema);

module.exports = {
  createBrandSchema,
  updateBrandSchema,
  listBrandsSchema,
  BrandSchema,
};