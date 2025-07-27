const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listContacts = async (req, res) => {
    const { instanceId } = req.params;
    const { page, limit } = req.query; // Agora page e limit são números

    const where = { instanceId };

    try {
        const totalContacts = await prisma.contact.count({ where });
        const contacts = await prisma.contact.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                updatedAt: 'desc',
            },
        });

        res.status(200).json({
            data: contacts,
            pagination: {
                total: totalContacts,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalContacts / limit),
            },
        });
    } catch (error) {
        console.error("Erro ao listar contatos:", error);
        res.status(500).json({ error: 'Falha ao buscar contatos.' });
    }
};

exports.getContactSummary = async (req, res) => {
    const { instanceId } = req.params;

    try {
        const totalContacts = await prisma.contact.count({
            where: { instanceId },
        });

        const contacts = await prisma.contact.findMany({
            where: { instanceId },
            select: {
                phoneNumber: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        res.status(200).json({
            totalContacts,
            phoneNumbers: contacts.map(c => c.phoneNumber),
        });
    } catch (error) {
        console.error("Erro ao obter resumo de contatos:", error);
        res.status(500).json({ error: 'Falha ao obter resumo de contatos.' });
    }
};

exports.getContactSummary = async (req, res) => {
    const { instanceId } = req.params;

    try {
        const totalContacts = await prisma.contact.count({
            where: { instanceId },
        });

        const contacts = await prisma.contact.findMany({
            where: { instanceId },
            select: {
                phoneNumber: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        res.status(200).json({
            totalContacts,
            phoneNumbers: contacts.map(c => c.phoneNumber),
        });
    } catch (error) {
        console.error("Erro ao obter resumo de contatos:", error);
        res.status(500).json({ error: 'Falha ao obter resumo de contatos.' });
    }
};
