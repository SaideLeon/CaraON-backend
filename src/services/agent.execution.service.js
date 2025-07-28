import { PrismaClient } from '@prisma/client';
import { generateResponse, generateStreamedResponse } from './genkit.service.js';
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
 * Executa um agente especialista, incluindo o uso de ferramentas.
 * @param {object} agent - O objeto do agente especialista.
 * @param {string} messageContent - A mensagem do usuário.
 * @returns {Promise<string>} A resposta do agente.
 */
async function executeSpecialistAgent(agent, messageContent) {
  console.log(`>> executeSpecialistAgent: Executando especialista ${agent.name} (ID: ${agent.id})`);
  const availableTools = agent.tools ? agent.tools.filter(t => t.isActive) : [];
  const toolsContext = availableTools.map(t => ({
    name: t.tool.name,
    description: t.tool.description,
  }));

  const agentPrompt = `
${agent.persona}

${toolsContext.length > 0 ? 'Ferramentas disponíveis:\n' + toolsContext.map(t => `- ${t.name}: ${t.description}`).join('\n') : ''}

Mensagem do usuário: "${messageContent}"

Sua tarefa é responder à mensagem. Se precisar de uma ferramenta, indique com "USAR_FERRAMENTA: [nome_da_ferramenta]".
`;
  console.log(`>> executeSpecialistAgent: Prompt inicial para o especialista:`, agentPrompt);

  let agentResponse = await generateResponse(agentPrompt, { ...agent.config });
  console.log(`>> executeSpecialistAgent: Resposta inicial do especialista: "${agentResponse}"`);

  const toolExecutionResult = await checkAndExecuteTools(agent, agentResponse, messageContent);

  if (toolExecutionResult) {
    console.log(`>> executeSpecialistAgent: Resultado da execução da ferramenta:`, toolExecutionResult);
    const enhancedPrompt = `
${agent.persona}

Mensagem do usuário: "${messageContent}"

Contexto obtido da ferramenta:
${toolExecutionResult}

Com base neste contexto, forneça a resposta final e completa.
`;
    console.log(`>> executeSpecialistAgent: Prompt aprimorado para o especialista:`, enhancedPrompt);
    agentResponse = await generateResponse(enhancedPrompt, { ...agent.config });
    console.log(`>> executeSpecialistAgent: Resposta final do especialista (pós-ferramenta): "${agentResponse}"`);
  }

  return agentResponse;
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
 * Verifica se uma ferramenta é necessária, extrai parâmetros e a executa.
 */
async function checkAndExecuteTools(agent, agentResponse, originalMessage) {
  console.log('>> checkAndExecuteTools: Verificando necessidade de ferramentas...');
  const availableTools = agent.tools ? agent.tools.filter(t => t.isActive) : [];
  if (availableTools.length === 0) {
    console.log('>> checkAndExecuteTools: Nenhuma ferramenta disponível para este agente.');
    return null;
  }

  const extraction = await extractToolAndParameters(agentResponse, availableTools, originalMessage);
  if (!extraction) {
    console.log('>> checkAndExecuteTools: Nenhuma ferramenta ou parâmetros extraídos da resposta.');
    return null;
  }

  const { tool, parameters, agentConfig } = extraction;
  console.log(`>> checkAndExecuteTools: Ferramenta extraída: ${tool.name}, Parâmetros:`, parameters);
  try {
    const toolResult = await executeToolFunction(tool, parameters, agentConfig);
    console.log(`>> checkAndExecuteTools: Resultado da ferramenta ${tool.name}:`, toolResult);
    return `Resultado da ferramenta ${tool.name}: ${JSON.stringify(toolResult)}`;
  } catch (error) {
    console.error(`>> checkAndExecuteTools: Erro ao executar a ferramenta ${tool.name}:`, error);
    return `Erro ao executar a ferramenta ${tool.name}: ${error.message}`;
  }
}

/**
 * Usa um LLM para extrair a ferramenta e seus parâmetros.
 */
async function extractToolAndParameters(agentResponse, availableTools, originalMessage) {
  console.log('>> extractToolAndParameters: Tentando extrair ferramenta e parâmetros...');
  const toolIndicators = ['USAR_FERRAMENTA:', 'EXECUTAR_TOOL:', 'FERRAMENTA_NECESSÁRIA:'];
  if (!toolIndicators.some(ind => agentResponse.toUpperCase().includes(ind))) {
    console.log('>> extractToolAndParameters: Nenhum indicador de uso de ferramenta encontrado na resposta.');
    return null;
  }

  const toolSchema = availableTools.map(t => ({
    name: t.tool.name,
    description: t.tool.description,
    parameters: t.tool.config.requiredFields || t.tool.config.searchFields || ['query'],
  }));

  const prompt = `
Você analisa uma conversa e extrai o nome de uma ferramenta e seus parâmetros em JSON.

Conversa:
- Usuário: "${originalMessage}"
- Agente: "${agentResponse}"

Ferramentas:
${JSON.stringify(toolSchema, null, 2)}

Responda APENAS com um objeto JSON com "toolName" e "parameters".
`;
  console.log('>> extractToolAndParameters: Prompt para extração:', prompt);

  try {
    const jsonResponse = await generateResponse(prompt, { temperature: 0 });
    console.log('>> extractToolAndParameters: Resposta do LLM para extração:', jsonResponse);
    const cleanedJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    console.log('>> extractToolAndParameters: JSON parseado:', parsed);

    if (!parsed.toolName || !parsed.parameters) {
      console.log('>> extractToolAndParameters: JSON parseado não contém toolName ou parameters.');
      return null;
    }

    const selectedTool = availableTools.find(t => t.tool.name === parsed.toolName);
    if (!selectedTool) {
      console.log(`>> extractToolAndParameters: Ferramenta selecionada '${parsed.toolName}' não está disponível.`);
      return null;
    }

    console.log('>> extractToolAndParameters: Extração bem-sucedida.');
    return { tool: selectedTool.tool, parameters: parsed.parameters, agentConfig: selectedTool.config };
  } catch (error) {
    console.error('>> extractToolAndParameters: Erro ao extrair parâmetros com LLM:', error);
    return null;
  }
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
 * Executa um agente diretamente, sem seleção de filhos ou ferramentas, com streaming.
 */
async function executeAgentDirectStream(agent, messageContent, conversationId, streamCallback) {
  console.log(`>> executeAgentDirectStream: Executando agente ${agent.name} (ID: ${agent.id}) diretamente com stream.`);
  
  // 1. Recuperar histórico da conversa
  const history = getFormattedHistory(conversationId);

  // 2. Construir o prompt com o histórico
  const prompt = `${agent.persona}${history}\n\nMensagem do usuário: "${messageContent}"`;
  console.log(`>> executeAgentDirectStream: Prompt com histórico:`, prompt);

  // 3. Gerar resposta com streaming
  const finalResponse = await generateStreamedResponse(prompt, { ...agent.config }, streamCallback);
  console.log(`>> executeAgentDirectStream: Resposta final: "${finalResponse}"`);

  // 4. Salvar a interação no histórico
  addMessageToHistory(conversationId, 'user', messageContent);
  addMessageToHistory(conversationId, 'agent', finalResponse);

  return finalResponse;
}

/**
 * Executa o fluxo de roteamento e execução de agentes em múltiplos níveis com streaming.
 * @param {string} instanceId - O ID da instância.
 * @param {string} messageContent - A mensagem do usuário.
 * @param {string} userPhone - O telefone do usuário.
 * @param {(chunk: string) => void} streamCallback - Callback para enviar pedaços da resposta.
 */
async function executeHierarchicalAgentFlowStream(instanceId, messageContent, userPhone, streamCallback) {
  console.log(`\n-- Início da Execução Hierárquica com Stream: Instância ${instanceId} --`);
  const startTime = Date.now();
  let executionLog = [];
  let routerAgentIdForLog = null;
  const conversationId = userPhone; // Usar o telefone do usuário como ID da conversa

  try {
    const routerAgent = await agentHierarchyService.getParentAgent(instanceId, null);
    if (!routerAgent) throw new Error(`Nenhum Agente Roteador principal encontrado para a instância ${instanceId}`);
    executionLog.push({ agentId: routerAgent.id, name: routerAgent.name, type: 'Router' });
    routerAgentIdForLog = routerAgent.id;

    const organizationAgents = await agentHierarchyService.getOrganizationParentAgents(instanceId);
    if (organizationAgents.length === 0) {
      console.log('Nenhum departamento encontrado. O roteador principal responderá com stream.');
      const finalResponse = await executeAgentDirectStream(routerAgent, messageContent, conversationId, streamCallback);
      await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);
      return { finalResponse };
    }

    // A seleção de agente não é um processo de streaming, então permanece igual.
    const departmentAgent = await selectAgent(routerAgent, organizationAgents, messageContent, 'organization');
    if (!departmentAgent) {
      console.log('Nenhum departamento selecionado. O roteador responderá com stream.');
      const finalResponse = await executeAgentDirectStream(routerAgent, messageContent, conversationId, streamCallback);
      await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);
      return { finalResponse };
    }
    executionLog.push({ agentId: departmentAgent.id, name: departmentAgent.name, type: 'Department' });

    const specialistAgents = await agentHierarchyService.getChildAgents(departmentAgent.id);
    if (specialistAgents.length === 0) {
        console.log('Nenhum especialista encontrado. O departamento responderá com stream.');
        const finalResponse = await executeAgentDirectStream(departmentAgent, messageContent, conversationId, streamCallback);
        await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);
        return { finalResponse };
    }

    const specialistAgent = await selectAgent(departmentAgent, specialistAgents, messageContent, 'specialist');
    if (!specialistAgent) {
        console.log('Nenhum especialista selecionado. O departamento responderá com stream.');
        const finalResponse = await executeAgentDirectStream(departmentAgent, messageContent, conversationId, streamCallback);
        await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);
        return { finalResponse };
    }
    executionLog.push({ agentId: specialistAgent.id, name: specialistAgent.name, type: 'Specialist' });

    // A execução do especialista e o refinamento ainda não suportam streaming neste exemplo.
    // Para um streaming completo, executeSpecialistAgent e refineResponseWithParent também precisariam ser adaptados.
    console.log('Executando o Agente Especialista (sem stream para esta etapa)...');
    const specialistResponse = await executeSpecialistAgent(specialistAgent, messageContent, conversationId);
    
    console.log('Refinando a resposta com o Roteador (sem stream para esta etapa)...');
    const finalResponse = await refineResponseWithParent(routerAgent, messageContent, specialistResponse, conversationId);

    // Para a resposta final refinada, podemos fazer o stream dela se desejado, mas por simplicidade aqui enviamos de uma vez.
    streamCallback(finalResponse); 

    // Salvar no histórico após o refinamento final
    addMessageToHistory(conversationId, 'user', messageContent);
    addMessageToHistory(conversationId, 'agent', finalResponse);

    await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);
    return { finalResponse };

  } catch (error) {
    console.error(`!! ERRO na execução hierárquica com stream: ${error.message}`, { stack: error.stack });
    await logAgentExecution(routerAgentIdForLog, instanceId, messageContent, null, Date.now() - startTime, false, executionLog, error.message);
    throw error; // Lança o erro para ser tratado pelo WebSocket
  }
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
  executeHierarchicalAgentFlowStream, // Export the new function
};
