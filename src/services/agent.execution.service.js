import { PrismaClient } from '@prisma/client';
import { generateResponse, ai, searchProductsTool } from './genkit.service.js'; // Importar 'ai' e 'searchProductsTool'
import { executeToolFunction } from './tools.service.js';
import * as agentHierarchyService from './agent.hierarchy.service.js';
import { selectAgent } from './agent.selection.service.js';
import { addMessageToHistory, getFormattedHistory } from './conversation.history.service.js';
import { z } from 'zod';

const prisma = new PrismaClient();

/**
 * Executa o fluxo de roteamento e execução de agentes em múltiplos níveis.
 * @param {string} instanceId - O ID da instância.
 * @param {string} messageContent - A mensagem do usuário.
 * @param {string} userPhone - O telefone do usuário.
 */
async function executeHierarchicalAgentFlow(instanceId, messageContent, userPhone) {
  const flowId = `[Flow-${Date.now()}]`;
  console.log(`${flowId} -- Início da Execução Hierárquica: Instância ${instanceId} --`);
  console.log(`${flowId} Mensagem do usuário: "${messageContent}"`);
  const startTime = Date.now();
  let executionLog = [];
  let routerAgentIdForLog = null;

  try {
    // 1. Obter o Agente Roteador
    console.log(`${flowId} 1. Buscando Agente Roteador...`);
    const routerAgent = await agentHierarchyService.getParentAgent(instanceId, null);
    if (!routerAgent) {
      throw new Error(`Nenhum Agente Roteador principal encontrado para a instância ${instanceId}`);
    }
    console.log(`${flowId}  -> Roteador encontrado: ${routerAgent.name} (ID: ${routerAgent.id})`);
    executionLog.push({ agentId: routerAgent.id, name: routerAgent.name, type: 'Router' });
    routerAgentIdForLog = routerAgent.id;

    // 2. Selecionar o departamento (Agente Pai da Organização)
    console.log(`${flowId} 2. Roteador selecionando o departamento...`);
    const organizationAgents = await agentHierarchyService.getOrganizationParentAgents(instanceId);
    if (organizationAgents.length === 0) {
        console.log(`${flowId}  -> Nenhum departamento (agente PARENT) encontrado. O roteador principal responderá diretamente.`);
        const directResponse = await executeAgentDirect(routerAgent, messageContent, flowId);
        const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, directResponse, Date.now() - startTime, true, executionLog, null, flowId);
        console.log(`${flowId} -- Fim da Execução: Resposta direta do Roteador. Tempo total: ${Date.now() - startTime}ms --\n`);
        return { finalResponse: directResponse, executionId: execution.id };
    }
    const departmentAgent = await selectAgent(routerAgent, organizationAgents, messageContent, 'organization', flowId);

    if (!departmentAgent) {
      console.log(`${flowId}  -> Nenhum departamento selecionado pelo roteador. O roteador principal responderá diretamente.`);
      const directResponse = await executeAgentDirect(routerAgent, messageContent, flowId);
      const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, directResponse, Date.now() - startTime, true, executionLog, null, flowId);
      console.log(`${flowId} -- Fim da Execução: Resposta direta do Roteador. Tempo total: ${Date.now() - startTime}ms --\n`);
      return { finalResponse: directResponse, executionId: execution.id };
    }
    console.log(`${flowId}  -> Departamento selecionado: ${departmentAgent.name} (ID: ${departmentAgent.id})`);
    executionLog.push({ agentId: departmentAgent.id, name: departmentAgent.name, type: 'Department' });

    // 3. Selecionar o Agente Filho (Especialista)
    console.log(`${flowId} 3. Departamento selecionando o especialista...`);
    const specialistAgents = await agentHierarchyService.getChildAgents(departmentAgent.id);
     if (specialistAgents.length === 0) {
        console.log(`${flowId}  -> Nenhum especialista (agente CHILD) encontrado para o departamento ${departmentAgent.name}. O departamento responderá diretamente.`);
        const departmentResponse = await executeAgentDirect(departmentAgent, messageContent, flowId);
        const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, departmentResponse, Date.now() - startTime, true, executionLog, null, flowId);
        console.log(`${flowId} -- Fim da Execução: Resposta direta do Departamento. Tempo total: ${Date.now() - startTime}ms --\n`);
        return { finalResponse: departmentResponse, executionId: execution.id };
    }
    const specialistAgent = await selectAgent(departmentAgent, specialistAgents, messageContent, 'specialist', flowId);

    if (!specialistAgent) {
      console.log(`${flowId}  -> Nenhum especialista selecionado. O agente do departamento responderá diretamente.`);
      const departmentResponse = await executeAgentDirect(departmentAgent, messageContent, flowId);
      const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, departmentResponse, Date.now() - startTime, true, executionLog, null, flowId);
      console.log(`${flowId} -- Fim da Execução: Resposta direta do Departamento. Tempo total: ${Date.now() - startTime}ms --\n`);
      return { finalResponse: departmentResponse, executionId: execution.id };
    }
    console.log(`${flowId}  -> Especialista selecionado: ${specialistAgent.name} (ID: ${specialistAgent.id})`);
    executionLog.push({ agentId: specialistAgent.id, name: specialistAgent.name, type: 'Specialist' });

    // 4. Executar o Agente Especialista
    console.log(`${flowId} 4. Executando o Agente Especialista...`);
    const specialistResponse = await executeSpecialistAgent(specialistAgent, messageContent, flowId);
    console.log(`${flowId}  -> Resposta do Especialista: "${specialistResponse}"`);

    // 5. Refinar a resposta (opcional)
    console.log(`${flowId} 5. Refinando a resposta com o Roteador...`);
    const finalResponse = await refineResponseWithParent(routerAgent, messageContent, specialistResponse, flowId);
    console.log(`${flowId}  -> Resposta Final (após refinamento): "${finalResponse}"`);

    // 6. Registrar a execução
    console.log(`${flowId} 6. Registrando a execução completa...`);
    const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog, null, flowId);

    console.log(`${flowId} -- Fim da Execução: Sucesso. Tempo total: ${Date.now() - startTime}ms --\n`);
    return { finalResponse, executionId: execution.id };

  } catch (error) {
    console.error(`${flowId} !! ERRO na execução hierárquica: ${error.message}`, { stack: error.stack });
    const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, null, Date.now() - startTime, false, executionLog, error.message, flowId);
    console.log(`${flowId} -- Fim da Execução: FALHA. Tempo total: ${Date.now() - startTime}ms --\n`);
    const richError = new Error(error.message);
    richError.executionId = execution ? execution.id : null;
    throw richError;
  }
}

/**
 * Executa um agente especialista, transformando ferramentas do DB em ferramentas dinâmicas do Genkit.
 * @param {object} agent - O objeto do agente especialista.
 * @param {string} messageContent - A mensagem do usuário.
 * @returns {Promise<string>} A resposta do agente.
 */
async function executeSpecialistAgent(agent, messageContent, flowId) {
  console.log(`${flowId} >> [Especialista: ${agent.name}] Iniciando execução...`);

  // 1. Transforma as ferramentas do Prisma (dinâmicas)
  const dynamicTools = agent.tools
    .filter(t => t.isActive && t.tool)
    .map(({ tool }) => {
      console.log(`${flowId} >> [Especialista: ${agent.name}] Criando ferramenta dinâmica: ${tool.name}`);
      return ai.dynamicTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: z.any(),
          outputSchema: z.any(),
        },
        async (input) => {
          console.log(`${flowId} >> [Especialista: ${agent.name}] Executando ferramenta '${tool.name}' com input:`, input);
          const result = await executeToolFunction(tool, input, agent.config);
          console.log(`${flowId} >> [Especialista: ${agent.name}] Resultado da ferramenta '${tool.name}':`, result);
          return result;
        }
      );
    });

  // 2. Combina as ferramentas dinâmicas com as ferramentas de sistema estáticas
  const availableTools = [searchProductsTool, ...dynamicTools];
  console.log(`${flowId} >> [Especialista: ${agent.name}] Ferramentas disponíveis: ${availableTools.map(t => t.name).join(', ')}`);

  const formattedHistory = await getFormattedHistory(agent.instanceId);
  console.log(`${flowId} >> [Especialista: ${agent.name}] Histórico formatado obtido.`);

  const agentPrompt = `${agent.persona}\n\nHistórico da Conversa:\n${formattedHistory}\n\nMensagem do usuário: "${messageContent}"`;
  console.log(`${flowId} >> [Especialista: ${agent.name}] Prompt final enviado para a IA:\n---`, agentPrompt, '\n---');


  // Faz uma única chamada para o ai.generate com as ferramentas combinadas.
  const finalResponse = await generateResponse(
    agentPrompt,
    { ...agent.config },
    availableTools,
    flowId
  );

  // Adiciona a interação ao histórico
  console.log(`${flowId} >> [Especialista: ${agent.name}] Adicionando interação ao histórico...`);
  await addMessageToHistory(agent.instanceId, 'user', messageContent);
  await addMessageToHistory(agent.instanceId, 'agent', finalResponse);
  console.log(`${flowId} >> [Especialista: ${agent.name}] Histórico atualizado.`);

  console.log(`${flowId} >> [Especialista: ${agent.name}] Resposta final: "${finalResponse}"`);
  return finalResponse;
}

/**
 * Executa um agente diretamente, sem seleção de filhos ou ferramentas.
 */
async function executeAgentDirect(agent, messageContent, flowId) {
  console.log(`${flowId} >> [Direto: ${agent.name}] Executando agente diretamente...`);
  const prompt = `${agent.persona}\n\nMensagem do usuário: "${messageContent}"`;
  console.log(`${flowId} >> [Direto: ${agent.name}] Prompt:`, prompt);
  const response = await generateResponse(prompt, { ...agent.config }, [], flowId);
  console.log(`${flowId} >> [Direto: ${agent.name}] Resposta: "${response}"`);
  return response;
}



/**
 * Permite que um agente de nível superior refine a resposta de um agente de nível inferior.
 */
async function refineResponseWithParent(parentAgent, originalMessage, childResponse, flowId) {
  console.log(`${flowId} >> [Refinamento: ${parentAgent.name}] Refinando resposta...`);
  const prompt = `\n${parentAgent.persona}\n\nMensagem original: "${originalMessage}"\nResposta do especialista: "${childResponse}"\n\nRevise e, se necessário, refine a resposta do especialista para garantir clareza, tom e completude. Se estiver boa, retorne-a como está.\n`;
  console.log(`${flowId} >> [Refinamento: ${parentAgent.name}] Prompt para refinamento:`, prompt);
  const refinedResponse = await generateResponse(prompt, { ...parentAgent.config }, [], flowId);
  console.log(`${flowId} >> [Refinamento: ${parentAgent.name}] Resposta refinada: "${refinedResponse}"`);
  return refinedResponse;
}



/**
 * Registra a execução completa do fluxo de agentes e retorna o registro.
 * @returns {Promise<object>} O registro da execução criada.
 */
async function logAgentExecution(routerAgentId, instanceId, userMessage, finalResponse, executionTime, success, agentChain = [], errorMessage = null, flowId) {
  console.log(`${flowId} >> [Log] Registrando execução...`, { routerAgentId, success, errorMessage });
  try {
    const execution = await prisma.agentExecution.create({
      data: {
        agentId: routerAgentId, // O ID do agente que iniciou o fluxo
        instanceId,
        userMessage,
        agentResponse: finalResponse,
        executionTime,
        success,
        toolsUsed: agentChain, // Usando este campo para registrar a cadeia de agentes
        errorMessage,
      },
    });
    console.log(`${flowId} >> [Log] Execução registrada com sucesso. ID: ${execution.id}`);
    return execution;
  } catch (error) {
    console.error(`${flowId} >> [Log] Erro ao registrar execução do agente:`, error);
    return null; // Retorna nulo em caso de falha no log
  }
}

export {
  executeHierarchicalAgentFlow,
};
