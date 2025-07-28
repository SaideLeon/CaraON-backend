import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); 

const createOrganization = async (req, res) => {
  const { instanceId } = req.params;
  const { name } = req.body;

  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const organization = await prisma.organization.create({
      data: { name, instanceId },
    });

    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao criar a organização.' });
  }
};

const listOrganizations = async (req, res) => {
  const { instanceId } = req.params;

  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const organizations = await prisma.organization.findMany({
      where: { instanceId },
    });

    res.status(200).json(organizations);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao listar as organizações.' });
  }
};

export default {
  createOrganization,
  listOrganizations,
};