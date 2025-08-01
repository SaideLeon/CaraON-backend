import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const listContacts = async (req, res) => {
  const { instanceId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Converte page e limit para números inteiros, com valores padrão
  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));

  const where = { instanceId };

  try {
    const totalContacts = await prisma.contact.count({ where });

    const contacts = await prisma.contact.findMany({
      where,
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.status(200).json({
      data: contacts,
      pagination: {
        total: totalContacts,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalContacts / limitNumber),
      },
    });
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: 'Falha ao buscar contatos.' });
  }
};

const getContactSummary = async (req, res) => {
  const { instanceId } = req.params;
  const where = { instanceId };

  try {
    const totalContacts = await prisma.contact.count({ where });
    const contacts = await prisma.contact.findMany({
      where,
      select: {
        phoneNumber: true,
        name: true,
        pushName: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.status(200).json({
      total: totalContacts,
      contacts: contacts.map(c => ({
        number: c.phoneNumber,
        name: c.name || c.pushName,
      })),
    });
  } catch (error) {
    console.error('Erro ao obter resumo de contatos:', error);
    res.status(500).json({ error: 'Falha ao buscar resumo de contatos.' });
  }
};




export default {
  listContacts,
  getContactSummary,
};