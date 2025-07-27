const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listMessages = async (req, res) => {
    const { instanceId } = req.params;
    const { contactId, page, limit } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where = { instanceId };
    if (contactId) {
        where.contactId = contactId;
    }

    try {
        const totalMessages = await prisma.message.count({ where });
        const messages = await prisma.message.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: {
                sentAt: 'desc',
            },
            include: {
                contact: true,
                agentExecution: {
                    include: {
                        agent: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        res.status(200).json({
            data: messages,
            pagination: {
                total: totalMessages,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalMessages / limitNum),
            },
        });
    } catch (error) {
        console.error("Erro ao listar mensagens:", error);
        res.status(500).json({ error: 'Falha ao buscar mensagens.' });
    }
};

exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    // Adicionar verificação de permissão (se o usuário pode deletar esta mensagem)

    try {
        await prisma.message.delete({
            where: { id: messageId },
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Mensagem não encontrada.' });
        }
        console.error("Erro ao deletar mensagem:", error);
        res.status(500).json({ error: 'Falha ao deletar a mensagem.' });
    }
};
