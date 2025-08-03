// src/services/agent.hierarchy.service.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cria um agente de nível superior (ROUTER ou PARENT).
 * @param {object} data - Dados do agente.
 * @returns {Promise<object>} O agente criado.
 */
async function createParentAgent({ name, persona, type, instanceId, organizationId, userId }) {
  if (type !== 'ROUTER' && type !== 'PARENT') {
    throw new Error('Tipo de agente inválido. Deve ser ROUTER ou PARENT.');
  }
  if (type === 'PARENT' && !organizationId) {
    throw new Error('OrganizationId é obrigatório para agentes PARENT.');
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      persona,
      type,
      instance: { connect: { id: instanceId } },
      organization: organizationId ? { connect: { id: organizationId } } : undefined,
      isActive: true,
      // Cria uma configuração padrão para o agente
      config: {
        create: {
          temperature: 0.7,
          model: 'gemini-1.5-pro',
        },
      },
    },
    include: { config: true },
  });

  return { ...agent, type }; // Garante que o tipo seja retornado
}

/**
 * Cria um agente filho (especialista).
 * @param {object} data - Dados do agente.
 * @returns {Promise<object>} O agente criado.
 */
async function createCustomChildAgent({ name, persona, toolIds, parentAgentId }) {
  const parentAgent = await prisma.agent.findUnique({ where: { id: parentAgentId } });
  if (!parentAgent) {
    throw new Error('Agente pai não encontrado.');
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      persona,
      type: 'CHILD',
      instance: { connect: { id: parentAgent.instanceId } },
      organization: parentAgent.organizationId ? { connect: { id: parentAgent.organizationId } } : undefined,
      parentAgent: { connect: { id: parentAgentId } },
      isActive: true,
      tools: {
        create: toolIds?.map(toolId => ({
          tool: { connect: { id: toolId } },
        })),
      },
      // Filhos herdam a configuração do pai, então não criamos uma específica por padrão
    },
    include: { tools: true },
  });

  return agent;
}

/**
 * Obtém os agentes filhos de um agente pai.
 * @param {string} parentAgentId - O ID do agente pai.
 * @returns {Promise<Array<object>>} A lista de agentes filhos.
 */
async function getChildAgents(parentAgentId) {
  return prisma.agent.findMany({
    where: {
      parentAgentId,
      isActive: true,
    },
    include: {
      tools: { include: { tool: true } },
      config: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });
}

/**
 * Desativa um agente e seus descendentes.
 * @param {string} agentId - O ID do agente a ser desativado.
 */
async function deactivateAgent(agentId) {
  // Usar uma transação para garantir a consistência
  return prisma.$transaction(async (tx) => {
    const agentToDeactivate = await tx.agent.findUnique({
      where: { id: agentId },
      include: { childAgents: true },
    });

    if (!agentToDeactivate) {
      throw new Error('Agente não encontrado.');
    }

    // Desativar recursivamente os filhos
    for (const child of agentToDeactivate.childAgents) {
      await deactivateAgent(child.id); // Chamada recursiva dentro da transação
    }

    // Desativar o agente principal
    return tx.agent.update({
      where: { id: agentId },
      data: { isActive: false },
    });
  });
}

export {
  createParentAgent,
  createCustomChildAgent,
  getChildAgents,
  deactivateAgent,
};
