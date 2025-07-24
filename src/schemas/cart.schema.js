const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const AddToCartBody = z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
    quantity: z.number().int().positive('A quantidade deve ser um número inteiro positivo.'),
});

const addToCartSchema = z.object({
  body: AddToCartBody.openapi({ refId: 'AddToCart' }),
});

const UpdateCartBody = z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
    quantity: z.number().int().min(0, 'A quantidade não pode ser negativa.'),
});

const updateCartSchema = z.object({
  body: UpdateCartBody.openapi({ refId: 'UpdateCart' }),
});

const RemoveFromCartBody = z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de produto inválido'),
});

const removeFromCartSchema = z.object({
  body: RemoveFromCartBody.openapi({refId: 'RemoveFromCart'}),
});

registry.register('AddToCart', AddToCartBody);
registry.register('UpdateCart', UpdateCartBody);
registry.register('RemoveFromCart', RemoveFromCartBody);

module.exports = {
  addToCartSchema,
  updateCartSchema,
  removeFromCartSchema,
};