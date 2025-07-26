const { PrismaClient } = require('@prisma/client');
const { generateResponse } = require('./genkit.service');
const { executeToolFunction } = require('./tools.service');
const agentHierarchyService = require('./agent.hierarchy.service');
const { selectAgent } = require('./agent.selection.service');

const prisma = new PrismaClient();

/**
 * Executa o fluxo de roteamento e execução de agentes em múltiplos níveis.
 * @param {string} instanceId - O ID da instância.
 * @param {string} messageContent - A mensagem do usuário.
 * @param {string} userPhone - O telefone do usuário.
 */
async function executeHierarchicalAgentFlow(instanceId, messageContent, userPhone) {
    const startTime = Date.now();
    let executionLog = []; // Para rastrear a cadeia de agentes

    try {
        // 1. Obter o Agente Roteador (Pai da Instância, sem organizationId)
        const routerAgent = await agentHierarchyService.getParentAgent(instanceId, null);
        if (!routerAgent) {
            throw new Error(`Nenhum Agente Roteador encontrado para a instância ${instanceId}`);
        }
        executionLog.push(routerAgent.id);

        // 2. O Roteador seleciona o departamento (Agente Pai da Organização)
        const organizationAgents = await agentHierarchyService.getOrganizationParentAgents(instanceId);
        const departmentAgent = await selectAgent(routerAgent, organizationAgents, messageContent, 'organization');

        // Se nenhum departamento for selecionado, o próprio roteador responde
        if (!departmentAgent) {
            console.log('Nenhum departamento selecionado. O roteador responderá diretamente.');
            const directResponse = await executeAgentDirect(routerAgent, messageContent);
            await logAgentExecution(routerAgent.id, instanceId, messageContent, directResponse, Date.now() - startTime, true, executionLog);
            return directResponse;
        }
        executionLog.push(departmentAgent.id);

        // 3. O Pai do Departamento seleciona o Agente Filho (Especialista)
        const specialistAgents = await agentHierarchyService.getChildAgents(departmentAgent.id);
        const specialistAgent = await selectAgent(departmentAgent, specialistAgents, messageContent, 'specialist');

        // Se nenhum especialista for selecionado, o pai do departamento responde
        if (!specialistAgent) {
            console.log('Nenhum especialista selecionado. O pai do departamento responderá.');
            const departmentResponse = await executeAgentDirect(departmentAgent, messageContent);
            await logAgentExecution(routerAgent.id, instanceId, messageContent, departmentResponse, Date.now() - startTime, true, executionLog);
            return departmentResponse;
        }
        executionLog.push(specialistAgent.id);

        // 4. O Agente Especialista executa a tarefa
        const specialistResponse = await executeSpecialistAgent(specialistAgent, messageContent);

        // 5. Opcional: Refinamento pelo Roteador/Pai
        const finalResponse = await refineResponseWithParent(routerAgent, messageContent, specialistResponse);

        // 6. Registrar a execução completa e obter o ID
        const execution = await logAgentExecution(routerAgent.id, instanceId, messageContent, finalResponse, Date.now() - startTime, true, executionLog);

        return { finalResponse, executionId: execution.id };

    } catch (error) {
        console.error('Erro na execução hierárquica de múltiplos níveis:', error);
        // Salva a execução falha e retorna o ID
        const execution = await logAgentExecution(null, instanceId, messageContent, null, Date.now() - startTime, false, executionLog, error.message);
        // Lança o erro com o ID da execução para referência
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

    let agentResponse = await generateResponse(agentPrompt, { ...agent.config });

    const toolExecutionResult = await checkAndExecuteTools(agent, agentResponse, messageContent);

    if (toolExecutionResult) {
        const enhancedPrompt = `
${agent.persona}

Mensagem do usuário: "${messageContent}"

Contexto obtido da ferramenta:
${toolExecutionResult}

Com base neste contexto, forneça a resposta final e completa.
`;
        agentResponse = await generateResponse(enhancedPrompt, { ...agent.config });
    }

    return agentResponse;
}

/**
 * Executa um agente diretamente, sem seleção de filhos ou ferramentas.
 */
async function executeAgentDirect(agent, messageContent) {
    const prompt = `${agent.persona}\n\nMensagem do usuário: "${messageContent}"`;
    return await generateResponse(prompt, { ...agent.config });
}

/**
 * Verifica se uma ferramenta é necessária, extrai parâmetros e a executa.
 */
async function checkAndExecuteTools(agent, agentResponse, originalMessage) {
    const availableTools = agent.tools ? agent.tools.filter(t => t.isActive) : [];
    if (availableTools.length === 0) return null;

    const extraction = await extractToolAndParameters(agentResponse, availableTools, originalMessage);
    if (!extraction) return null;

    const { tool, parameters, agentConfig } = extraction;
    try {
        const toolResult = await executeToolFunction(tool, parameters, agentConfig);
        return `Resultado da ferramenta ${tool.name}: ${JSON.stringify(toolResult)}`;
    } catch (error) {
        console.error(`Erro ao executar a ferramenta ${tool.name}:`, error);
        return `Erro ao executar a ferramenta ${tool.name}: ${error.message}`;
    }
}

/**
 * Usa um LLM para extrair a ferramenta e seus parâmetros.
 */
async function extractToolAndParameters(agentResponse, availableTools, originalMessage) {
    const toolIndicators = ['USAR_FERRAMENTA:', 'EXECUTAR_TOOL:', 'FERRAMENTA_NECESSÁRIA:'];
    if (!toolIndicators.some(ind => agentResponse.toUpperCase().includes(ind))) return null;

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

    try {
        const jsonResponse = await generateResponse(prompt, { temperature: 0 });
        const cleanedJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (!parsed.toolName || !parsed.parameters) return null;

        const selectedTool = availableTools.find(t => t.tool.name === parsed.toolName);
        if (!selectedTool) return null;

        return { tool: selectedTool.tool, parameters: parsed.parameters, agentConfig: selectedTool.config };
    } catch (error) {
        console.error("Erro ao extrair parâmetros com LLM:", error);
        return null;
    }
}

/**
 * Permite que um agente de nível superior refine a resposta de um agente de nível inferior.
 */
async function refineResponseWithParent(parentAgent, originalMessage, childResponse) {
    const prompt = `
${parentAgent.persona}

Mensagem original: "${originalMessage}"
Resposta do especialista: "${childResponse}"

Revise e, se necessário, refine a resposta do especialista para garantir clareza, tom e completude. Se estiver boa, retorne-a como está.
`;
    return await generateResponse(prompt, { ...parentAgent.config });
}

/**
 * Registra a execução completa do fluxo de agentes e retorna o registro.
 * @returns {Promise<object>} O registro da execução criada.
 */
async function logAgentExecution(routerAgentId, instanceId, userMessage, finalResponse, executionTime, success, agentChain = [], errorMessage = null) {
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
        return execution;
    } catch (error) {
        console.error('Erro ao registrar execução do agente:', error);
        return null; // Retorna nulo em caso de falha no log
    }
}

module.exports = {
    executeHierarchicalAgentFlow,
};
