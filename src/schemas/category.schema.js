import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido.'),
  description: z.string().optional(),
});

const createCategorySchema = z.object({
  body: categorySchema,
});

const updateCategorySchema = z.object({
  body: categorySchema.partial(),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de categoria inválido.'),
  }),
});

const listCategoriesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

export {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
};
