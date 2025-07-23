const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { registry } = require('../docs/openapi');
const { z } = require('zod');
const { createOrderSchema, updateOrderStatusSchema } = require('../schemas/order.schema');

const OrderSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  total: z.number(),
  status: z.string().optional(),
});

registry.registerPath({
  method: 'post',
  path: '/orders',
  summary: 'Cria um novo pedido a partir do carrinho do usuário',
  tags: ['Orders'],
  tags: ['Pedidos'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createOrderSchema.shape.body,
          examples: {
            exemplo: {
              summary: 'Pedido de teste',
              value: { userId: 'usuario_teste', total: 150.00 }
            }
          }
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Pedido criado',
      content: { 'application/json': { schema: OrderSchema } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/orders',
  summary: 'Lista todos os pedidos do usuário',
  tags: ['Orders'],
  tags: ['Pedidos'],
  responses: {
    200: {
      description: 'Lista de pedidos',
      content: { 'application/json': { schema: z.array(OrderSchema) } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/orders/{orderId}',
  summary: 'Busca um pedido específico pelo ID',
  tags: ['Orders'],
  tags: ['Pedidos'],
  request: {
    params: z.object({ id: z.string() })
  },
  responses: {
    200: {
      description: 'Pedido retornado',
      content: { 'application/json': { schema: OrderSchema } }
    },
    404: { description: 'Pedido não encontrado' }
  }
});

exports.createOrder = async (req, res) => {
    const { userId, total } = req.body;
    try {
        // Cria o pedido
        const order = await prisma.order.create({
            data: { userId, total },
        });
        res.status(201).json(order);
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Falha ao criar o pedido.' });
    }
};

exports.listOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany();
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Falha ao listar os pedidos.' });
    }
};

exports.getOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }
        res.status(200).json(order);
    } catch (error) {
        console.error('Erro ao obter pedido:', error);
        res.status(500).json({ error: 'Falha ao obter o pedido.' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const order = await prisma.order.update({
            where: { id },
            data: { status },
        });
        res.status(200).json(order);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({ error: 'Falha ao atualizar o status do pedido.' });
    }
};