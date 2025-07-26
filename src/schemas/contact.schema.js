const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const listContactsSchema = z.object({
    params: z.object({
        instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
    }),
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
    }),
});

const ContactSchema = z.object({
    id: z.string(),
    instanceId: z.string(),
    phoneNumber: z.string(),
    name: z.string().optional(),
    pushName: z.string().optional(),
    createdAt: z.string().datetime(),
}).openapi('Contact');

registry.register('Contact', ContactSchema);

module.exports = {
    listContactsSchema,
};
