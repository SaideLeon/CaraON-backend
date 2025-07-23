const { generateResponse } = require('./genkit.service');
const agentHierarchyService = require('./agent.hierarchy.service');

/**
 * Seleciona o agente filho mais adequado para responder a uma mensagem.
 * @param {string} parentAgentId - O ID do agente pai.
 * @param {string} messageContent - O conteúdo da mensagem do usuário.
 * @returns {Promise<object|null>} O objeto do agente filho selecionado ou null se nenhum for adequado.
 */
async function selectChildAgent(parentAgentId, messageContent) {
  const parentAgent = await prisma.agent.findUnique({
    where: { id: parentAgentId },
    include: {
      childAgents: {
        where: { isActive: true },
        include: {
          tools: { include: { tool: true } },
          template: true,
        },
      },
    },
  });

  if (!parentAgent || !parentAgent.childAgents || parentAgent.childAgents.length === 0) {
    return null;
  }

  // Criar contexto para o agente pai decidir
  const childAgentsContext = parentAgent.childAgents.map(child => ({
    id: child.id,
    name: child.name,
    description: child.persona,
    category: child.template?.category || 'personalizado',
    tools: child.tools.map(t => t.tool.name),
  }));

  const selectionPrompt = `
Você é um agente orquestrador. Analise a mensagem do usuário e selecione o agente filho mais adequado para responder.

Mensagem do usuário: "${messageContent}"

Agentes filhos disponíveis:
${childAgentsContext.map(child => `
- ID: ${child.id}
- Nome: ${child.name}
- Categoria: ${child.category}
- Descrição: ${child.description}
- Ferramentas: ${child.tools.join(', ')}
`).join('\n')}

Responda APENAS com o ID do agente filho mais adequado, ou "NONE" se nenhum for adequado.
Considere o contexto da mensagem e as especialidades de cada agente.
`;

  try {
    const llmResponse = await generateResponse(selectionPrompt, {
      maxTokens: 100,
      temperature: 0.1,
      model: parentAgent.config?.model || 'gemini-pro',
    });

    const selectedId = llmResponse.trim();
    
    if (selectedId === 'NONE' || !selectedId) {
      return null;
    }

    const selectedAgent = parentAgent.childAgents.find(child => child.id === selectedId);
    return selectedAgent || null;

  } catch (error) {
    console.error('Erro na seleção do agente filho via LLM:', error);
    // Fallback: em caso de erro, retorna o primeiro agente filho por prioridade
    const childrenByPriority = await agentHierarchyService.getChildAgents(parentAgentId);
    return childrenByPriority.length > 0 ? childrenByPriority[0] : null;
  }
}

module.exports = {
  selectChildAgent,
};
