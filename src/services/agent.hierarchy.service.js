import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Cria um agente PAI (departamento) ou um agente ROUTER (roteador principal).
 */
async function createParentAgent(data) {
  const { name, persona, type, instanceId, organizationId, userId } = data;

  // O tipo de agente agora é passado diretamente, não mais derivado.
  const agentType = type;
  let routerAgentId = null;

  // Se for um PARENT, ele precisa ser vinculado ao ROUTER da instância.
  if (agentType === 'PARENT') {
    const instanceRouter = await getParentAgent(instanceId, null); // Busca o ROUTER
    if (instanceRouter) {
      routerAgentId = instanceRouter.id;
    } else {
        // Esta é uma salvaguarda. O fluxo normal deve criar o Roteador primeiro.
        console.warn(`Tentativa de criar agente PARENT para a organização ${organizationId} sem um agente ROUTER na instância ${instanceId}.`);
    }
  }
  
  const parentAgent = await prisma.agent.create({
    data: {
      name,
      type: agentType,
      persona,
      instanceId,
      organizationId,
      routerAgentId, // Vincula o PARENT ao ROUTER
      isActive: true,
      priority: 0,
      config: {
        create: {
          maxTokens: 2000,
          temperature: 0.7,
          model: 'googleai/gemini-2.0-flash',
          systemPrompt: 'Você é um agente orquestrador que delega tarefas para agentes especializados.',
          fallbackMessage: 'Desculpe, não consegui processar sua solicitação no momento.'
        }
      }
    },
    include: {
      config: true,
      childAgents: true
    }
  });

  return parentAgent;
}


/**
 * Cria um agente filho personalizado
 */
async function createCustomChildAgent(data) {
  const { name, persona, instanceId, organizationId, parentAgentId, toolIds = [] } = data;
  
  const childAgent = await prisma.agent.create({
    data: {
      name,
      type: 'CHILD',
      persona,
      instanceId,
      organizationId,
      parentAgentId,
      isActive: true,
      priority: 2,
      config: {
        create: {
          maxTokens: 1200,
          temperature: 0.9,
          model: 'googleai/gemini-2.0-flash',
          systemPrompt: 'Você é um agente especialista personalizado.',
          fallbackMessage: 'Não consegui processar sua solicitação personalizada.'
        }
      }
    },
    include: {
      config: true
    }
  });

  // Adicionar ferramentas específicas
  if (toolIds && toolIds.length > 0) {
      for (const toolId of toolIds) {
        await prisma.agentTool.create({
          data: {
            agentId: childAgent.id,
            toolId,
            isActive: true
          }
        });
      }
  }

  return childAgent;
}

/**
 * Busca agentes filhos de um agente pai
 */
async function getChildAgents(parentAgentId) {
  return await prisma.agent.findMany({
    where: {
      parentAgentId,
      isActive: true
    },
    include: {
      tools: {
        include: {
          tool: true
        }
      },
      config: true
    },
    orderBy: {
      priority: 'asc'
    }
  });
}

/**
 * Busca o agente Roteador (se organizationId for nulo) ou um agente Pai de uma organização.
 */
async function getParentAgent(instanceId, organizationId = null) {
  const agentType = organizationId ? 'PARENT' : 'ROUTER';
  
  return await prisma.agent.findFirst({
    where: {
      instanceId,
      organizationId,
      type: agentType,
      isActive: true
    },
    orderBy: {
      priority: 'desc'
    },
    include: {
      childAgents: {
        where: { isActive: true },
        include: {
          tools: {
            include: {
              tool: true
            }
          },
          config: true
        }
      },
      config: true
    }
  });
}

/**
 * Atualiza a prioridade de um agente filho
 */
async function updateAgentPriority(agentId, priority) {
  return await prisma.agent.update({
    where: { id: agentId },
    data: { priority }
  });
}

/**
 * Desativa um agente
 */
async function deactivateAgent(agentId) {
  return await prisma.agent.update({
    where: { id: agentId },
    data: { isActive: false }
  });
}

/**
 * Busca todos os agentes pais de organizações dentro de uma instância.
 * @param {string} instanceId - O ID da instância.
 * @returns {Promise<Array<object>>} Uma lista de agentes pais de organizações.
 */
async function getOrganizationParentAgents(instanceId) {
  return await prisma.agent.findMany({
    where: {
      instanceId,
      type: 'PARENT',
      isActive: true,
      organizationId: {
        not: null, // Garante que apenas agentes de organizações sejam retornados
      },
    },
    include: {
      organization: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });
}

export {
  createParentAgent,
  createCustomChildAgent,
  getChildAgents,
  getParentAgent,
  updateAgentPriority,
  deactivateAgent,
  getOrganizationParentAgents,
};