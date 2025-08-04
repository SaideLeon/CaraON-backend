// src/services/agent.execution.service.js
import { PrismaClient } from '@prisma/client';
import { AgentManager } from './agent.core.service.js';
import * as agentHierarchyService from './agent.hierarchy.service.js';

const prisma = new PrismaClient();
const agentManager = new AgentManager(process.env.GEMINI_API_KEY);


/**
 * Cria uma estrutura de agente padrão como fallback.
 */
async function createDefaultAgentStructure(instance) {
  console.log(`Criando estrutura de agente padrão para a instância: ${instance.name}`);

  // 1. Cria a Organização 'Padrão'
  const organization = await prisma.organization.upsert({
    where: { instanceId_name: { instanceId: instance.id, name: 'Padrão' } },
    update: {},
    create: { instanceId: instance.id, name: 'Padrão' },
  });

  // 2. Cria o Agente Roteador
  const routerAgent = await agentHierarchyService.createParentAgent({
    name: `Roteador - ${instance.name}`,
    persona: 'Você é o agente roteador principal...',
    type: 'ROUTER',
    instanceId: instance.id,
    userId: instance.userId,
  });

  // 3. Cria o Agente Pai 'Atendimento Geral'
  const parentAgent = await agentHierarchyService.createParentAgent({
    name: 'Atendimento Geral',
    persona: 'Você é do atendimento geral...',
    type: 'PARENT',
    instanceId: instance.id,
    organizationId: organization.id,
    userId: instance.userId,
  });

  // 4. Cria o Agente Filho 'Assistente de Produtos'
  const productTool = await prisma.tool.findUnique({ where: { name: 'searchProducts' } });
  const childAgent = await agentHierarchyService.createCustomChildAgent({
    name: 'Assistente de Produtos',
    persona: 'Eu sou um especialista em produtos...',
    parentAgentId: parentAgent.id,
    toolIds: productTool ? [productTool.id] : [],
  });

  return { routerAgent, parentAgent, childAgent };
}

/**
 * Roteia a mensagem para o agente de departamento (PAI) apropriado.
 */
async function routeToParentAgent(routerAgent, parentAgents, message) {
  if (!parentAgents || parentAgents.length === 0) {
    throw new Error('Nenhum agente de departamento (PAI) configurado.');
  }
  if (parentAgents.length === 1) {
    return parentAgents[0];
  }

  const departments = parentAgents.map(p => `- ${p.name}: ${p.persona}`).join('\n');
  const routingPrompt = `
    Você é um agente de roteamento. Sua tarefa é direcionar a mensagem do usuário para o departamento correto.
    
    Departamentos disponíveis:
    ${departments}
    
    Mensagem do usuário: "${message}"
    
    Com base na mensagem, qual é o nome EXATO do departamento mais apropriado? Responda APENAS com o nome do departamento.
  `;

  const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
  const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash' });
  const result = await llm.invoke(routingPrompt);
  const chosenDepartmentName = result.content.trim();

  const chosenAgent = parentAgents.find(p => p.name === chosenDepartmentName);

  return chosenAgent || parentAgents[0]; // Fallback para o primeiro
}

/**
 * Roteia a mensagem para o agente especialista (FILHO) apropriado.
 */
async function routeToChildAgent(parentAgent, childAgents, message) {
    if (!childAgents || childAgents.length === 0) {
        return parentAgent; // Se não há filhos, o pai assume
    }
    if (childAgents.length === 1) {
        return childAgents[0]; // Rota direta se houver apenas um
    }

    const specialists = childAgents.map(c => {
        const tools = c.tools.map(t => t.tool.name).join(', ') || 'Nenhuma ferramenta específica';
        return `- Nome: ${c.name}\n  Especialidade: ${c.persona}\n  Ferramentas: [${tools}]`;
    }).join('\n\n');

    const routingPrompt = `Você é um gerente de departamento. Sua tarefa é atribuir a solicitação do usuário ao especialista mais qualificado.\n\nEspecialistas disponíveis:\n${specialists}\n\nSolicitação do usuário: "${message}"\n\nCom base na solicitação, qual especialista é o mais adequado? Responda APENAS com o nome EXATO do especialista.`;

    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash' });
    const result = await llm.invoke(routingPrompt);
    const chosenSpecialistName = result.content.trim();

    const chosenAgent = childAgents.find(c => c.name === chosenSpecialistName);

    // Fallback: se o LLM não decidir ou errar, usa o agente filho de maior prioridade ou o próprio pai.
    return chosenAgent || childAgents[0] || parentAgent;
}


/**
 * Executa o fluxo completo do agente, desde o roteamento até a resposta final.
 */
async function executeHierarchicalAgentFlow(instanceId, messageContent, userPhone) {
  let executionId;
  try {
    const execution = await prisma.agentExecution.create({
      data: { instanceId, userMessage: messageContent, success: false },
    });
    executionId = execution.id;

    const routerAgent = await prisma.agent.findFirst({
      where: { instanceId, type: 'ROUTER', parentAgentId: null, isActive: true },
      orderBy: { priority: 'desc' },
    });

    if (!routerAgent) {
      const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
      if (!instance) {
        throw new Error(`Instância com ID ${instanceId} não encontrada.`);
      }
      console.log(`Nenhum agente roteador encontrado para ${instance.name}. Criando estrutura padrão.`);
      const defaultStructure = await createDefaultAgentStructure(instance);
      routerAgent = defaultStructure.routerAgent; // Atribui o roteador recém-criado
    }

    const parentAgents = await prisma.agent.findMany({
      where: { instanceId, type: 'PARENT', isActive: true },
    });

    const parentAgent = await routeToParentAgent(routerAgent, parentAgents, messageContent);

    const childAgents = await prisma.agent.findMany({
        where: { parentAgentId: parentAgent.id, isActive: true },
        include: { tools: { include: { tool: true } } },
        orderBy: { priority: 'desc' },
    });

    let finalAgent;
    if (childAgents.length > 1) {
        finalAgent = await routeToChildAgent(parentAgent, childAgents, messageContent);
    } else if (childAgents.length === 1) {
        finalAgent = childAgents[0];
    } else {
        finalAgent = parentAgent;
    }
    
    await prisma.agentExecution.update({
        where: { id: executionId },
        data: { agentId: finalAgent.id }
    });

    const result = await agentManager.processMessage(
      finalAgent.id,
      messageContent,
      executionId,
      userPhone
    );

    if (result.error) {
        throw new Error(result.error);
    }

    return { finalResponse: result.response, executionId };

  } catch (error) {
    console.error(`Erro no fluxo de execução do agente (Execution ID: ${executionId}):`, error);
    if (executionId) {
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          success: false,
          errorMessage: error.message,
          agentResponse: "Desculpe, ocorreu um erro interno e não consegui processar sua solicitação.",
        },
      });
    }
    error.executionId = executionId;
    throw error;
  }
}

export {
  executeHierarchicalAgentFlow,
};

