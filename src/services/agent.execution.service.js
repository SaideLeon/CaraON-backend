const { PrismaClient } = require('@prisma/client');
const { generateResponse } = require('./genkit.service');
const { executeToolFunction } = require('./tools.service');
const agentHierarchyService = require('./agent.hierarchy.service');
const agentSelectionService = require('./agent.selection.service');

const prisma = new PrismaClient();

/**
 * Executa o fluxo hierárquico de agentes
 */
async function executeHierarchicalAgentFlow(instanceId, organizationId, messageContent, userPhone) {
  const startTime = Date.now();
  
  try {
    // 1. Buscar o agente pai
    const parentAgent = await agentHierarchyService.getParentAgent(instanceId, organizationId);
    
    if (!parentAgent) {
      throw new Error('Nenhum agente pai encontrado para esta instância/organização');
    }

    // 2. O agente pai decide qual agente filho usar
    const selectedChildAgent = await agentSelectionService.selectChildAgent(parentAgent.id, messageContent);
    
    if (!selectedChildAgent) {
      // Se não há agente filho adequado, o pai responde diretamente
      return await executeAgentDirect(parentAgent, messageContent, userPhone);
    }

    // 3. Executar o agente filho selecionado
    const childResponse = await executeChildAgent(selectedChildAgent, messageContent, userPhone);
    
    // 4. O agente pai pode processar/refinar a resposta do filho
    const finalResponse = await refineResponseWithParent(parentAgent, messageContent, childResponse);
    
    // 5. Registrar a execução
    await logAgentExecution(parentAgent.id, instanceId, messageContent, finalResponse, Date.now() - startTime, true, [selectedChildAgent.id]);
    
    return finalResponse;
    
  } catch (error) {
    console.error('Erro na execução hierárquica:', error);
    await logAgentExecution(null, instanceId, messageContent, null, Date.now() - startTime, false, [], error.message);
    throw error;
  }
}

/**
 * Executa um agente filho específico
 */
async function executeChildAgent(childAgent, messageContent, userPhone) {
  const startTime = Date.now();
  
  try {
    // Preparar contexto com ferramentas disponíveis
    const availableTools = childAgent.tools.filter(t => t.isActive);
    const toolsContext = availableTools.map(t => ({
      name: t.tool.name,
      description: t.tool.description,
      type: t.tool.type
    }));

    // Construir prompt para o agente filho
    const childPrompt = `
${childAgent.persona}

Ferramentas disponíveis:
${toolsContext.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Mensagem do usuário: "${messageContent}"

Se precisar usar uma ferramenta, indique claramente qual ferramenta usar e os parâmetros necessários.
Forneça uma resposta completa e útil baseada na sua especialidade.
`;

    // Gerar resposta inicial
    let response = await generateResponse(childPrompt, {
      maxTokens: childAgent.config.maxTokens,
      temperature: childAgent.config.temperature,
      model: childAgent.config.model
    });

    // Verificar se precisa executar ferramentas
    const toolExecution = await checkAndExecuteTools(childAgent, response, messageContent);
    
    if (toolExecution) {
      // Regenerar resposta com dados das ferramentas
      const enhancedPrompt = `
${childPrompt}

Dados obtidos das ferramentas:
${toolExecution}

Agora forneça uma resposta completa utilizando essas informações.
`;
      
      response = await generateResponse(enhancedPrompt, {
        maxTokens: childAgent.config.maxTokens,
        temperature: childAgent.config.temperature,
        model: childAgent.config.model
      });
    }

    // Registrar execução do agente filho
    await logAgentExecution(childAgent.id, childAgent.instanceId, messageContent, response, Date.now() - startTime, true, []);
    
    return response;
    
  } catch (error) {
    console.error(`Erro na execução do agente filho ${childAgent.id}:`, error);
    await logAgentExecution(childAgent.id, childAgent.instanceId, messageContent, null, Date.now() - startTime, false, [], error.message);
    
    return childAgent.config.fallbackMessage || 'Desculpe, não consegui processar sua solicitação nesta especialidade.';
  }
}

/**
 * Verifica se a resposta indica uso de ferramenta e executa se necessário
 */
async function checkAndExecuteTools(agent, response, originalMessage) {
  const toolIndicators = [
    'USAR_FERRAMENTA:',
    'EXECUTAR_TOOL:',
    'FERRAMENTA_NECESSÁRIA:',
    'CONSULTAR_DADOS:'
  ];

  const needsTool = toolIndicators.some(indicator => 
    response.toUpperCase().includes(indicator)
  );

  if (!needsTool) {
    return null;
  }

  // Extrair qual ferramenta usar e os parâmetros
  // Implementação simplificada - pode ser melhorada com regex mais sofisticado
  const availableTools = agent.tools.filter(t => t.isActive);
  
  for (const agentTool of availableTools) {
    if (response.toUpperCase().includes(agentTool.tool.name.toUpperCase())) {
      try {
        const toolResult = await executeToolFunction(agentTool.tool, originalMessage, agentTool.config);
        return `Resultado da ferramenta ${agentTool.tool.name}: ${JSON.stringify(toolResult)}`;
      } catch (error) {
        console.error(`Erro ao executar ferramenta ${agentTool.tool.name}:`, error);
        return `Erro ao executar ferramenta ${agentTool.tool.name}: ${error.message}`;
      }
    }
  }

  return null;
}

/**
 * Agente pai refina a resposta do agente filho
 */
async function refineResponseWithParent(parentAgent, originalMessage, childResponse) {
  const refinementPrompt = `
${parentAgent.persona}

Mensagem original do usuário: "${originalMessage}"
Resposta do agente especialista: "${childResponse}"

Sua tarefa é revisar e refinar a resposta do agente especialista, garantindo que:
1. A resposta está completa e precisa
2. O tom está adequado para o contexto da empresa
3. Não há informações contraditórias
4. A resposta atende completamente à pergunta do usuário

Se a resposta estiver adequada, pode retorná-la sem modificações.
Se precisar de ajustes, faça-os mantendo o conhecimento técnico do especialista.
`;

  try {
    const refinedResponse = await generateResponse(refinementPrompt, {
      maxTokens: parentAgent.config.maxTokens,
      temperature: parentAgent.config.temperature,
      model: parentAgent.config.model
    });

    return refinedResponse;
    
  } catch (error) {
    console.error('Erro no refinamento da resposta:', error);
    // Fallback: retornar a resposta original do agente filho
    return childResponse;
  }
}

/**
 * Executa agente diretamente (sem filhos)
 */
async function executeAgentDirect(agent, messageContent, userPhone) {
  const startTime = Date.now();
  
  try {
    const response = await generateResponse(
      `${agent.persona}\n\nMensagem do usuário: "${messageContent}"`,
      {
        maxTokens: agent.config.maxTokens,
        temperature: agent.config.temperature,
        model: agent.config.model
      }
    );

    await logAgentExecution(agent.id, agent.instanceId, messageContent, response, Date.now() - startTime, true, []);
    
    return response;
    
  } catch (error) {
    console.error('Erro na execução direta do agente:', error);
    await logAgentExecution(agent.id, agent.instanceId, messageContent, null, Date.now() - startTime, false, [], error.message);
    
    return agent.config.fallbackMessage || 'Desculpe, não consegui processar sua solicitação no momento.';
  }
}

/**
 * Registra a execução do agente para análise
 */
async function logAgentExecution(agentId, instanceId, userMessage, agentResponse, executionTime, success, toolsUsed = [], errorMessage = null) {
  try {
    await prisma.agentExecution.create({
      data: {
        agentId,
        instanceId,
        userMessage,
        agentResponse,
        executionTime,
        success,
        toolsUsed,
        errorMessage
      }
    });
  } catch (error) {
    console.error('Erro ao registrar execução do agente:', error);
  }
}

module.exports = {
  executeHierarchicalAgentFlow,
  executeAgentDirect,
  executeChildAgent,
};
