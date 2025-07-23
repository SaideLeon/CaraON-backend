const { z } = require('zod');

const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
    quantity: z.number().int().positive('A quantidade deve ser um número inteiro positivo.'),
  }),
});

const updateCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
    quantity: z.number().int().min(0, 'A quantidade não pode ser negativa.'),
  }),
});

const removeFromCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
  }),
});

module.exports = {
  addToCartSchema,
  updateCartSchema,
  removeFromCartSchema,
};
