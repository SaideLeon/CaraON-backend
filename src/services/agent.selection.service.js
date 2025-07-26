const { generateResponse } = require('./genkit.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

Responda APENAS com o ID do ${contextType} selecionado. Se nenhum for adequado, responda com "NONE".
`;

    try {
        const llmResponse = await generateResponse(selectionPrompt, {
            maxTokens: 100,
            temperature: 0.1,
            model: orchestratorAgent.config?.model || 'gemini-pro',
        });

        const selectedId = llmResponse.trim().replace(/"/g, '');

        if (selectedId === 'NONE' || !selectedId) {
            return null;
        }

        const selectedAgent = availableAgents.find(agent => agent.id === selectedId);
        return selectedAgent || null;

    } catch (error) {
        console.error(`Erro na seleção de ${contextType} via LLM:`, error);
        // Fallback: em caso de erro, retorna o primeiro por prioridade (se aplicável)
        return availableAgents[0] || null;
    }
}

module.exports = {
    selectAgent,
};