const { runFlow } = require('@genkit-ai/flow');
const { flows } = require('../agents/flows');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Executa o fluxo Genkit de um agente.
 * @param {string} agentId - ID do agente.
 * @param {string} messageContent - Conteúdo da mensagem para o agente.
 * @returns {Promise<string>} A resposta do agente.
 */
async function executeAgentFlow(agentId, messageContent) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });

  if (!agent) {
    throw new Error(`Agente com ID ${agentId} não encontrado.`);
  }

  const flow = flows[agent.flowId];

  if (!flow) {
    throw new Error(`Fluxo Genkit com ID ${agent.flowId} não encontrado.`);
  }

  const flowInput = {
    name: 'Usuário', // Pode ser dinâmico no futuro
    message: messageContent,
    persona: agent.persona,
  };

  const response = await runFlow(flow, flowInput);
  return response;
}

module.exports = {
  executeAgentFlow,
};
