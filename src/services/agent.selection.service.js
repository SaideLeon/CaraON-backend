const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seleciona um agente para responder a uma mensagem.
 * Prioriza agentes de organização, depois agentes de instância.
 * @param {string} instanceId - ID da instância do WhatsApp.
 * @param {string} [organizationId] - ID opcional da organização.
 * @returns {Promise<object|null>} O agente selecionado ou null se nenhum for encontrado.
 */
async function selectAgent(instanceId, organizationId) {
  let agent = null;

  // 1. Tenta encontrar um agente específico para a organização
  if (organizationId) {
    agent = await prisma.agent.findFirst({
      where: {
        instanceId,
        organizationId,
      },
    });
  }

  // 2. Se não encontrou na organização ou não há organizationId, tenta encontrar um agente de instância
  if (!agent) {
    agent = await prisma.agent.findFirst({
      where: {
        instanceId,
        organizationId: null, // Agente de instância
      },
    });
  }

  return agent;
}

module.exports = {
  selectAgent,
};
