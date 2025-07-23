const { z } = require('zod');

const createOrderSchema = z.object({
  body: z.object({
    userId: z.string(),
    total: z.number().positive('O total deve ser um número positivo.'),
  }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'RETURNED', 'REFUNDED']),
  }),
  params: z.object({
    id: z.string(),
  }),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
};