const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const CreateOrderBody = z.object({
  userId: z.string(),
  total: z.number().positive('O total deve ser um número positivo.'),
});

const createOrderSchema = z.object({
  body: CreateOrderBody.openapi({ refId: 'CreateOrder' }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'RETURNED', 'REFUNDED']),
  }),
  params: z.object({
    id: z.string(),
  }),
});

registry.register('CreateOrder', CreateOrderBody);

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
};