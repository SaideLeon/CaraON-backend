import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

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

export {
  createOrderSchema,
  updateOrderStatusSchema,
};