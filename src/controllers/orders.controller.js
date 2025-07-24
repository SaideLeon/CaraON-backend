const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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