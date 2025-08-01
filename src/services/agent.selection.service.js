import { generateResponse } from './genkit.service.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ai } from './genkit.service.js'; // Importa a instância do Genkit

const prisma = new PrismaClient();

// Schema para a saída estruturada do LLM
const AgentSelectionSchema = z.object({
  agentId: z.string().describe('O ID do agente selecionado. Deve ser um dos IDs fornecidos.'),
});

// Função para validar se um ID tem o formato ObjectId do MongoDB
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Seleciona o agente mais adequado (filho ou pai de organização) para uma tarefa.
 * @param {object} orchestratorAgent - O agente que está fazendo a seleção (roteador ou pai de organização).
 * @param {Array<object>} availableAgents - A lista de agentes disponíveis para seleção.
 * @param {string} messageContent - O conteúdo da mensagem do usuário.
 * @param {string} selectionType - O tipo de seleção ('organization' ou 'specialist').
 * @returns {Promise<object|null>} O agente selecionado ou null.
 */
async function selectAgent(orchestratorAgent, availableAgents, messageContent, selectionType) {
  if (!availableAgents || availableAgents.length === 0) {
    return null;
  }

  const contextType = selectionType === 'organization' ? 'departamento (organização)' : 'agente especialista';

  const agentsContext = availableAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.persona || (agent.organization ? `Agente principal do departamento ${agent.organization.name}` : 'Agente especialista'),
  }));

  const selectionPrompt = `
Você é um agente orquestrador. Sua tarefa é analisar a mensagem do usuário e selecionar o ${contextType} mais adequado para lidar com a solicitação.

Mensagem do usuário: "${messageContent}"

Opções disponíveis:
${agentsContext.map(agent => `
- ID: ${agent.id}
- Nome: ${agent.name}
- Descrição/Especialidade: ${agent.description}`).join('\n')}

Qual é o ID do ${contextType} mais adequado? Se nenhum for adequado, retorne um ID vazio.
`;

  try {
    const { output } = await ai.generate({
      prompt: selectionPrompt,
      model: orchestratorAgent.config?.model || 'googleai/gemini-2.0-flash',
      output: { schema: AgentSelectionSchema }, // Força a saída estruturada
      config: {
        temperature: 0.1,
      },
    });

    if (!output || !output.agentId) {
      console.log(`LLM não selecionou um agente. Nenhum ${contextType} será usado.`);
      return null;
    }

    const selectedId = output.agentId.trim();

    if (!isValidObjectId(selectedId)) {
      console.warn(`LLM retornou um ID inválido: '${selectedId}'. Ignorando a seleção.`);
      return null;
    }

    const selectedAgent = availableAgents.find(agent => agent.id === selectedId);

    if (!selectedAgent) {
      console.warn(`LLM retornou o ID '${selectedId}', mas este agente não está na lista de opções disponíveis.`);
      return null;
    }

    return selectedAgent;

  } catch (error) {
    console.error(`Erro na seleção de ${contextType} via LLM:`, error);
    return availableAgents.sort((a, b) => (a.priority || 0) - (b.priority || 0))[0] || null;
  }
}

export {
  selectAgent,
};