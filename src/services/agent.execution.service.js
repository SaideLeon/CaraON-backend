import { PrismaClient } from '@prisma/client';
import { generateResponse } from './genkit.service.js';
import { executeToolFunction } from './tools.service.js';
import * as agentHierarchyService from './agent.hierarchy.service.js';
import { selectAgent } from './agent.selection.service.js';
import { addMessageToHistory, getFormattedHistory } from './conversation.history.service.js'; // Importar o serviço de histórico

const prisma = new PrismaClient();

/**
 * Executa o fluxo de roteamento e execução de agentes em múltiplos níveis.
 * @param {string} instanceId - O ID da instância.
 * @param {string} messageContent - A mensagem do usuário.
 * @param {string} userPhone - O telefone do usuário.
 */
async function executeHierarchicalAgentFlow(instanceId, messageContent, userPhone) {
  console.log("\n-- Início da Execução Hierárquica: Instância " + instanceId + " --");
  console.log("Mensagem do usuário: \"" + messageContent + "\"");
  const startTime = Date.now();
  let executionLog = [];
  let routerAgentIdForLog = null;

  try {
    // 1. Obter o Agente Roteador
    console.log('1. Buscando Agente Roteador...');
    const routerAgent = await agentHierarchyService.getParentAgent(instanceId, null);
    if (!routerAgent) {
      throw new Error(`Nenhum Agente Roteador principal encontrado para a instância ${instanceId}`);
    }
    console.log(` -> Roteador encontrado: ${routerAgent.name} (ID: ${routerAgent.id})`);
    executionLog.push({ agentId: routerAgent.id, name: routerAgent.name, type: 'Router' });
    routerAgentIdForLog = routerAgent.id;

    // 2. Selecionar o departamento (Agente Pai da Organização)
    console.log('2. Roteador selecionando o departamento...');
    const organizationAgents = await agentHierarchyService.getOrganizationParentAgents(instanceId);
    if (organizationAgents.length === 0) {
        console.log('Nenhum departamento (agente PARENT) encontrado. O roteador principal responderá diretamente.');
        const directResponse = await executeAgentDirect(routerAgent, messageContent);
        const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, directResponse, Date.now() - startTime, true, executionLog);
        console.log(`-- Fim da Execução: Resposta direta do Roteador. Tempo total: ${Date.now() - startTime}ms --\n`);
        return { finalResponse: directResponse, executionId: execution.id };
    }
    const departmentAgent = await selectAgent(routerAgent, organizationAgents, messageContent, 'organization');

    if (!departmentAgent) {
      console.log(' -> Nenhum departamento selecionado pelo roteador. O roteador principal responderá diretamente.');
      const directResponse = await executeAgentDirect(routerAgent, messageContent);
      const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, directResponse, Date.now() - startTime, true, executionLog);
      console.log(`-- Fim da Execução: Resposta direta do Roteador. Tempo total: ${Date.now() - startTime}ms --\n`);
      return { finalResponse: directResponse, executionId: execution.id };
    }
    console.log(` -> Departamento selecionado: ${departmentAgent.name} (ID: ${departmentAgent.id})`);
    executionLog.push({ agentId: departmentAgent.id, name: departmentAgent.name, type: 'Department' });

    // 3. Selecionar o Agente Filho (Especialista)
    console.log('3. Departamento selecionando o especialista...');
    const specialistAgents = await agentHierarchyService.getChildAgents(departmentAgent.id);
     if (specialistAgents.length === 0) {
        console.log(`Nenhum especialista (agente CHILD) encontrado para o departamento ${departmentAgent.name}. O departamento responderá diretamente.`);
        const departmentResponse = await executeAgentDirect(departmentAgent, messageContent);
        const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, departmentResponse, Date.now() - startTime, true, executionLog);
        console.log(`-- Fim da Execução: Resposta direta do Departamento. Tempo total: ${Date.now() - startTime}ms --\n`);
        return { finalResponse: departmentResponse, executionId: execution.id };
    }
    const specialistAgent = await selectAgent(departmentAgent, specialistAgents, messageContent, 'specialist');

    if (!specialistAgent) {
      console.log(' -> Nenhum especialista selecionado. O agente do departamento responderá diretamente.');
      const departmentResponse = await executeAgentDirect(departmentAgent, messageContent);
      const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, departmentResponse, Date.now() - startTime, true, executionLog);
      console.log(`-- Fim da Execução: Resposta direta do Departamento. Tempo total: ${Date.now() - startTime}ms --\n`);
      return { finalResponse: departmentResponse, executionId: execution.id };
    }
    console.log(` -> Especialista selecionado: ${specialistAgent.name} (ID: ${specialistAgent.id})`);
    executionLog.push({ agentId: specialistAgent.id, name: specialistAgent.name, type: 'Specialist' });

    // 4. Executar o Agente Especialista
    console.log('4. Executando o Agente Especialista...');
    const specialistResponse = await executeSpecialistAgent(specialistAgent, messageContent);
    console.log(` -> Resposta do Especialista: "${specialistResponse}"`);

    // 5. Refinar a resposta (opcional)
    console.log('5. Refinando a resposta com o Roteador...');
    const finalResponse = await refineResponseWithParent(routerAgent, messageContent, specialistResponse);
    console.log(` -> Resposta Final (após refinamento): "${finalResponse}"`);

    // 6. Registrar a execução
    console.log('6. Registrando a execução completa...');
    const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);

    console.log(`-- Fim da Execução: Sucesso. Tempo total: ${Date.now() - startTime}ms --\n`);
    return { finalResponse, executionId: execution.id };

  } catch (error) {
    console.error(`!! ERRO na execução hierárquica: ${error.message}`, { stack: error.stack });
    const execution = await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, null, Date.now() - startTime, false, executionLog, error.message);
    console.log(`-- Fim da Execução: FALHA. Tempo total: ${Date.now() - startTime}ms --\n`);
    const richError = new Error(error.message);
    richError.executionId = execution ? execution.id : null;
    throw richError;
  }
}

/**
 * Executa um agente especialista usando o ciclo de ferramentas automático do Genkit.
 * @param {object} agent - O objeto do agente especialista.
 * @param {string} messageContent - A mensagem do usuário.
 * @returns {Promise<string>} A resposta do agente.
 */
async function executeSpecialistAgent(agent, messageContent) {
  console.log(`>> executeSpecialistAgent: Executando especialista ${agent.name} com o método Genkit`);

  // Mapeia as ferramentas do Prisma para o formato que o Genkit espera
  const availableTools = agent.tools
    .filter(t => t.isActive && t.tool) // Garante que a ferramenta associada exista
    .map(t => t.tool); 

  const agentPrompt = `${agent.persona}\n\nMensagem do usuário: "${messageContent}"`;

  // Faz uma única chamada para o ai.generate com as ferramentas.
  // O Genkit gerenciará o ciclo de chamada de ferramentas automaticamente.
  const finalResponse = await generateResponse(
    agentPrompt, 
    { ...agent.config },
    availableTools
  );
  
  console.log(`>> executeSpecialistAgent: Resposta final do especialista: "${finalResponse}"`);
  return finalResponse;
}

/**
 * Executa um agente diretamente, sem seleção de filhos ou ferramentas.
 */
async function executeAgentDirect(agent, messageContent) {
  console.log(`>> executeAgentDirect: Executando agente ${agent.name} (ID: ${agent.id}) diretamente.`);
  const prompt = `${agent.persona}\n\nMensagem do usuário: "${messageContent}"`;
  console.log(`>> executeAgentDirect: Prompt:`, prompt);
  const response = await generateResponse(prompt, { ...agent.config });
  console.log(`>> executeAgentDirect: Resposta: "${response}"`);
  return response;
}



/**
 * Permite que um agente de nível superior refine a resposta de um agente de nível inferior.
 */
async function refineResponseWithParent(parentAgent, originalMessage, childResponse) {
  console.log(`>> refineResponseWithParent: Refinando resposta com o agente ${parentAgent.name}`);
  const prompt = `
${parentAgent.persona}

Mensagem original: "${originalMessage}"
Resposta do especialista: "${childResponse}"

Revise e, se necessário, refine a resposta do especialista para garantir clareza, tom e completude. Se estiver boa, retorne-a como está.
`;
  console.log('>> refineResponseWithParent: Prompt para refinamento:', prompt);
  const refinedResponse = await generateResponse(prompt, { ...parentAgent.config });
  console.log(`>> refineResponseWithParent: Resposta refinada: "${refinedResponse}"`);
  return refinedResponse;
}



/**
 * Registra a execução completa do fluxo de agentes e retorna o registro.
 * @returns {Promise<object>} O registro da execução criada.
 */
async function logAgentExecution(routerAgentId, instanceId, userMessage, finalResponse, executionTime, success, agentChain = [], errorMessage = null) {
  console.log(`>> logAgentExecution: Registrando execução...`, { routerAgentId, success, errorMessage });
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
    console.log(`>> logAgentExecution: Execução registrada com sucesso. ID: ${execution.id}`);
    return execution;
  } catch (error) {
    console.error('>> logAgentExecution: Erro ao registrar execução do agente:', error);
    return null; // Retorna nulo em caso de falha no log
  }
}

export {
  executeHierarchicalAgentFlow,
};
