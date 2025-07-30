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
async function selectAgent(orchestratorAgent, availableAgents, messageContent, selectionType, flowId) {
  console.log(`${flowId} >> [Seleção: ${selectionType}] Iniciando seleção pelo orquestrador ${orchestratorAgent.name}...`);

  if (!availableAgents || availableAgents.length === 0) {
    console.log(`${flowId} >> [Seleção: ${selectionType}] Nenhum agente disponível para seleção.`);
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

  console.log(`${flowId} >> [Seleção: ${selectionType}] Prompt enviado para o LLM:\n---`, selectionPrompt, '\n---');

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
      console.log(`${flowId} >> [Seleção: ${selectionType}] LLM não selecionou um agente. Nenhum ${contextType} será usado.`);
      return null;
    }

    const selectedId = output.agentId.trim();
    console.log(`${flowId} >> [Seleção: ${selectionType}] LLM retornou o ID: '${selectedId}'`);

    if (!isValidObjectId(selectedId)) {
      console.warn(`${flowId} >> [Seleção: ${selectionType}] LLM retornou um ID inválido. Ignorando a seleção.`);
      return null;
    }

    const selectedAgent = availableAgents.find(agent => agent.id === selectedId);

    if (!selectedAgent) {
      console.warn(`${flowId} >> [Seleção: ${selectionType}] LLM retornou o ID '${selectedId}', mas este agente não está na lista de opções disponíveis.`);
      return null;
    }

    console.log(`${flowId} >> [Seleção: ${selectionType}] Agente selecionado com sucesso: ${selectedAgent.name} (ID: ${selectedAgent.id})`);
    return selectedAgent;

  } catch (error) {
    console.error(`${flowId} >> [Seleção: ${selectionType}] Erro na seleção de ${contextType} via LLM:`, error);
    const fallbackAgent = availableAgents.sort((a, b) => (a.priority || 0) - (b.priority || 0))[0] || null;
    if (fallbackAgent) {
      console.log(`${flowId} >> [Seleção: ${selectionType}] Usando fallback para o agente de maior prioridade: ${fallbackAgent.name}`);
    }
    return fallbackAgent;
  }
}

export {
  selectAgent,
};