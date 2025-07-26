const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const listMessagesSchema = z.object({
    params: z.object({
        instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
    }),
    query: z.object({
        contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de contato inválido').optional(),
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
    }),
});

const deleteMessageSchema = z.object({
    params: z.object({
        messageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de mensagem inválido'),
    }),
});

// OpenAPI Schemas
const MessageSchema = z.object({
    id: z.string(),
    instanceId: z.string(),
    contactId: z.string(),
    wppId: z.string(),
    direction: z.enum(['INCOMING', 'OUTGOING']),
    content: z.string(),
    status: z.string().optional(),
    sentAt: z.string().datetime(),
}).openapi('Message');

registry.register('Message', MessageSchema);

module.exports = {
    listMessagesSchema,
    deleteMessageSchema,
};
