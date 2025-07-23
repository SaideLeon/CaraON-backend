# Evolução do Projeto CaraON: Arquitetura de Agentes Hierárquicos

Vou melhorar sua ideia para criar um sistema mais flexível e escalável onde os clientes podem criar seus próprios agentes filhos personalizados.

## Arquitetura Proposta

### 1. Hierarquia de Agentes
```
Agente Pai (Orquestrador)
├── Agente Filho 1 (Vendas)
├── Agente Filho 2 (Suporte)
├── Agente Filho 3 (Personalizado do Cliente)
└── Agente Filho N (Templates Predefinidos)
```

### 2. Nova Estrutura do Banco de Dados### 3. Serviços Atualizados

// Esquema Prisma atualizado para suportar agentes hierárquicos

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  instances Instance[]
  
  @@map("users")
}

model Instance {
  id       String @id @default(cuid())
  name     String
  clientId String @unique
  status   String @default("PENDING_QR")
  userId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user          User           @relation(fields: [userId], references: [id])
  organizations Organization[]
  agents        Agent[]
  
  @@map("instances")
}

model Organization {
  id         String @id @default(cuid())
  name       String
  instanceId String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  instance Instance @relation(fields: [instanceId], references: [id])
  agents   Agent[]
  
  @@map("organizations")
}

// Modelo principal para agentes (pai e filhos)
model Agent {
  id             String  @id @default(cuid())
  name           String
  type           AgentType // PAI, FILHO
  persona        String?
  instanceId     String
  organizationId String?
  parentAgentId  String? // Para agentes filhos
  templateId     String? // Para agentes baseados em templates
  isActive       Boolean @default(true)
  priority       Int     @default(0) // Prioridade para seleção
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  instance     Instance      @relation(fields: [instanceId], references: [id])
  organization Organization? @relation(fields: [organizationId], references: [id])
  parentAgent  Agent?        @relation("AgentHierarchy", fields: [parentAgentId], references: [id])
  childAgents  Agent[]       @relation("AgentHierarchy")
  template     AgentTemplate? @relation(fields: [templateId], references: [id])
  
  // Ferramentas disponíveis para este agente
  tools        AgentTool[]
  
  // Configurações específicas do agente
  config       AgentConfig?
  
  @@map("agents")
}

// Templates de agentes predefinidos
model AgentTemplate {
  id          String @id @default(cuid())
  name        String
  description String
  category    String // "vendas", "suporte", "geral", etc.
  defaultPersona String
  isSystem    Boolean @default(false) // Templates do sistema vs. do usuário
  userId      String? // null para templates do sistema
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agents Agent[]
  defaultTools AgentTemplateTools[]
  
  @@map("agent_templates")
}

// Ferramentas disponíveis no sistema
model Tool {
  id          String @id @default(cuid())
  name        String @unique
  description String
  type        ToolType // DATABASE, API, WEBHOOK, GENKIT_FLOW
  config      Json // Configuração específica da ferramenta
  isSystem    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agentTools AgentTool[]
  templateTools AgentTemplateTools[]
  
  @@map("tools")
}

// Relacionamento entre agentes e suas ferramentas
model AgentTool {
  id       String @id @default(cuid())
  agentId  String
  toolId   String
  config   Json? // Configuração específica para este agente
  isActive Boolean @default(true)

  agent Agent @relation(fields: [agentId], references: [id])
  tool  Tool  @relation(fields: [toolId], references: [id])
  
  @@unique([agentId, toolId])
  @@map("agent_tools")
}

// Ferramentas padrão dos templates
model AgentTemplateTools {
  id         String @id @default(cuid())
  templateId String
  toolId     String
  config     Json?

  template AgentTemplate @relation(fields: [templateId], references: [id])
  tool     Tool          @relation(fields: [toolId], references: [id])
  
  @@unique([templateId, toolId])
  @@map("agent_template_tools")
}

// Configurações específicas do agente
model AgentConfig {
  id                String @id @default(cuid())
  agentId           String @unique
  maxTokens         Int    @default(1000)
  temperature       Float  @default(0.7)
  model             String @default("gemini-pro")
  systemPrompt      String?
  fallbackMessage   String?
  timeoutSeconds    Int    @default(30)
  maxRetries        Int    @default(3)

  agent Agent @relation(fields: [agentId], references: [id])
  
  @@map("agent_configs")
}

// Histórico de execuções para análise
model AgentExecution {
  id               String @id @default(cuid())
  agentId          String
  instanceId       String
  userMessage      String
  agentResponse    String?
  executionTime    Int? // em millisegundos
  success          Boolean
  errorMessage     String?
  toolsUsed        Json? // Array de ferramentas utilizadas
  createdAt        DateTime @default(now())

  @@map("agent_executions")
}

enum AgentType {
  PAI
  FILHO
}

enum ToolType {
  DATABASE
  API
  WEBHOOK
  GENKIT_FLOW
  CUSTOM
}


### 3. Serviços Atualizados
```js

// src/services/agent.hierarchy.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cria um agente pai para uma instância ou organização
 */
async function createParentAgent(data) {
  const { name, persona, instanceId, organizationId, userId } = data;
  
  const parentAgent = await prisma.agent.create({
    data: {
      name,
      type: 'PAI',
      persona,
      instanceId,
      organizationId,
      isActive: true,
      priority: 0,
      config: {
        create: {
          maxTokens: 2000,
          temperature: 0.7,
          model: 'gemini-pro',
          systemPrompt: 'Você é um agente orquestrador que delega tarefas para agentes especializados.',
          fallbackMessage: 'Desculpe, não consegui processar sua solicitação no momento.'
        }
      }
    },
    include: {
      config: true,
      childAgents: true
    }
  });

  return parentAgent;
}

/**
 * Cria um agente filho baseado em um template
 */
async function createChildAgentFromTemplate(data) {
  const { name, templateId, instanceId, organizationId, parentAgentId, customPersona } = data;
  
  const template = await prisma.agentTemplate.findUnique({
    where: { id: templateId },
    include: { defaultTools: { include: { tool: true } } }
  });

  if (!template) {
    throw new Error('Template não encontrado');
  }

  const childAgent = await prisma.agent.create({
    data: {
      name,
      type: 'FILHO',
      persona: customPersona || template.defaultPersona,
      instanceId,
      organizationId,
      parentAgentId,
      templateId,
      isActive: true,
      priority: 1,
      config: {
        create: {
          maxTokens: 1500,
          temperature: 0.8,
          model: 'gemini-pro',
          systemPrompt: `Você é um agente especialista em ${template.category}.`,
          fallbackMessage: 'Não consegui processar sua solicitação nesta especialidade.'
        }
      }
    },
    include: {
      config: true,
      template: true
    }
  });

  // Adicionar ferramentas padrão do template
  for (const templateTool of template.defaultTools) {
    await prisma.agentTool.create({
      data: {
        agentId: childAgent.id,
        toolId: templateTool.toolId,
        config: templateTool.config,
        isActive: true
      }
    });
  }

  return childAgent;
}

/**
 * Cria um agente filho personalizado
 */
async function createCustomChildAgent(data) {
  const { name, persona, instanceId, organizationId, parentAgentId, toolIds = [] } = data;
  
  const childAgent = await prisma.agent.create({
    data: {
      name,
      type: 'FILHO',
      persona,
      instanceId,
      organizationId,
      parentAgentId,
      isActive: true,
      priority: 2,
      config: {
        create: {
          maxTokens: 1200,
          temperature: 0.9,
          model: 'gemini-pro',
          systemPrompt: 'Você é um agente especialista personalizado.',
          fallbackMessage: 'Não consegui processar sua solicitação personalizada.'
        }
      }
    },
    include: {
      config: true
    }
  });

  // Adicionar ferramentas específicas
  for (const toolId of toolIds) {
    await prisma.agentTool.create({
      data: {
        agentId: childAgent.id,
        toolId,
        isActive: true
      }
    });
  }

  return childAgent;
}

/**
 * Busca agentes filhos de um agente pai
 */
async function getChildAgents(parentAgentId) {
  return await prisma.agent.findMany({
    where: {
      parentAgentId,
      isActive: true
    },
    include: {
      tools: {
        include: {
          tool: true
        }
      },
      config: true,
      template: true
    },
    orderBy: {
      priority: 'asc'
    }
  });
}

/**
 * Busca o agente pai para uma instância/organização
 */
async function getParentAgent(instanceId, organizationId = null) {
  return await prisma.agent.findFirst({
    where: {
      instanceId,
      organizationId,
      type: 'PAI',
      isActive: true
    },
    include: {
      childAgents: {
        where: { isActive: true },
        include: {
          tools: {
            include: {
              tool: true
            }
          },
          config: true,
          template: true
        }
      },
      config: true
    }
  });
}

/**
 * Atualiza a prioridade de um agente filho
 */
async function updateAgentPriority(agentId, priority) {
  return await prisma.agent.update({
    where: { id: agentId },
    data: { priority }
  });
}

/**
 * Desativa um agente
 */
async function deactivateAgent(agentId) {
  return await prisma.agent.update({
    where: { id: agentId },
    data: { isActive: false }
  });
}

module.exports = {
  createParentAgent,
  createChildAgentFromTemplate,
  createCustomChildAgent,
  getChildAgents,
  getParentAgent,
  updateAgentPriority,
  deactivateAgent
};

```

```js
// src/services/agent.execution.service.js
const { PrismaClient } = require('@prisma/client');
const { generateResponse } = require('./genkit.service');
const { executeToolFunction } = require('./tools.service');
const agentHierarchyService = require('./agent.hierarchy.service');

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
    const selectedChildAgent = await selectChildAgent(parentAgent, messageContent);
    
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
 * Agente pai seleciona qual agente filho usar
 */
async function selectChildAgent(parentAgent, messageContent) {
  if (!parentAgent.childAgents || parentAgent.childAgents.length === 0) {
    return null;
  }

  // Criar contexto para o agente pai decidir
  const childAgentsContext = parentAgent.childAgents.map(child => ({
    id: child.id,
    name: child.name,
    description: child.persona,
    category: child.template?.category || 'personalizado',
    tools: child.tools.map(t => t.tool.name)
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
    const selection = await generateResponse(selectionPrompt, {
      maxTokens: 100,
      temperature: 0.1,
      model: parentAgent.config.model
    });

    const selectedId = selection.trim();
    
    if (selectedId === 'NONE') {
      return null;
    }

    return parentAgent.childAgents.find(child => child.id === selectedId);
    
  } catch (error) {
    console.error('Erro na seleção do agente filho:', error);
    // Fallback: selecionar por prioridade
    return parentAgent.childAgents.sort((a, b) => a.priority - b.priority)[0];
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
  selectChildAgent
};
```
```js
// src/services/agent.template.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cria templates padrão do sistema
 */
async function createSystemTemplates() {
  const systemTemplates = [
    {
      name: 'Agente de Vendas',
      description: 'Especialista em vendas, produtos e promoções',
      category: 'vendas',
      defaultPersona: 'Você é um especialista em vendas. Seu objetivo é ajudar clientes a encontrar produtos, informar sobre promoções e fechar vendas. Seja persuasivo, mas sempre honesto sobre os produtos.',
      isSystem: true,
      tools: ['getProductInfo', 'getSalesData', 'checkPromotion']
    },
    {
      name: 'Agente de Suporte',
      description: 'Especialista em suporte técnico e atendimento ao cliente',
      category: 'suporte',
      defaultPersona: 'Você é um especialista em suporte técnico. Ajude os clientes a resolver problemas, esclarecer dúvidas e fornecer informações sobre produtos e serviços. Seja paciente e detalhado.',
      isSystem: true,
      tools: ['searchKnowledgeBase', 'createTicket', 'checkOrderStatus']
    },
    {
      name: 'Agente de Informações',
      description: 'Fornece informações gerais sobre a empresa e produtos',
      category: 'informacoes',
      defaultPersona: 'Você é um assistente de informações. Forneça informações claras e precisas sobre a empresa, produtos, serviços e políticas. Seja informativo e prestativo.',
      isSystem: true,
      tools: ['getCompanyInfo', 'getProductCatalog', 'getPolicies']
    },
    {
      name: 'Agente de Agendamento',
      description: 'Especialista em agendamentos e gestão de horários',
      category: 'agendamento',
      defaultPersona: 'Você é um especialista em agendamentos. Ajude os clientes a marcar consultas, reuniões ou serviços. Gerencie calendários e confirme disponibilidade.',
      isSystem: true,
      tools: ['checkAvailability', 'scheduleAppointment', 'sendReminder']
    },
    {
      name: 'Agente Financeiro',
      description: 'Especialista em questões financeiras e pagamentos',
      category: 'financeiro',
      defaultPersona: 'Você é um especialista financeiro. Ajude com questões de pagamento, boletos, faturas e informações financeiras. Seja preciso e seguro ao lidar com dados financeiros.',
      isSystem: true,
      tools: ['checkPaymentStatus', 'generateInvoice', 'processPayment']
    }
  ];

  for (const template of systemTemplates) {
    const existingTemplate = await prisma.agentTemplate.findFirst({
      where: { name: template.name, isSystem: true }
    });

    if (!existingTemplate) {
      const createdTemplate = await prisma.agentTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          defaultPersona: template.defaultPersona,
          isSystem: template.isSystem
        }
      });

      // Adicionar ferramentas padrão
      for (const toolName of template.tools) {
        const tool = await prisma.tool.findFirst({
          where: { name: toolName }
        });

        if (tool) {
          await prisma.agentTemplateTools.create({
            data: {
              templateId: createdTemplate.id,
              toolId: tool.id
            }
          });
        }
      }
    }
  }
}

/**
 * Cria um template personalizado do usuário
 */
async function createCustomTemplate(data) {
  const { name, description, category, defaultPersona, userId, toolIds = [] } = data;

  const template = await prisma.agentTemplate.create({
    data: {
      name,
      description,
      category,
      defaultPersona,
      isSystem: false,
      userId
    }
  });

  // Adicionar ferramentas ao template
  for (const toolId of toolIds) {
    await prisma.agentTemplateTools.create({
      data: {
        templateId: template.id,
        toolId
      }
    });
  }

  return await prisma.agentTemplate.findUnique({
    where: { id: template.id },
    include: {
      defaultTools: {
        include: {
          tool: true
        }
      }
    }
  });
}

/**
 * Lista templates disponíveis
 */
async function getAvailableTemplates(userId = null) {
  const templates = await prisma.agentTemplate.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId: userId }
      ]
    },
    include: {
      defaultTools: {
        include: {
          tool: true
        }
      }
    },
    orderBy: [
      { isSystem: 'desc' },
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  return templates;
}

/**
 * Busca template por ID
 */
async function getTemplateById(templateId) {
  return await prisma.agentTemplate.findUnique({
    where: { id: templateId },
    include: {
      defaultTools: {
        include: {
          tool: true
        }
      }
    }
  });
}

// src/services/agent.template.service.js (continuação)
/**
 * Atualiza template personalizado
 */
async function updateCustomTemplate(templateId, data, userId) {
  const { name, description, category, defaultPersona, toolIds = [] } = data;

  // Verificar se o template pertence ao usuário
  const existingTemplate = await prisma.agentTemplate.findFirst({
    where: { 
      id: templateId,
      userId: userId,
      isSystem: false
    }
  });

  if (!existingTemplate) {
    throw new Error('Template não encontrado ou não pertence ao usuário');
  }

  // Atualizar template
  const updatedTemplate = await prisma.agentTemplate.update({
    where: { id: templateId },
    data: {
      name,
      description,
      category,
      defaultPersona
    }
  });

  // Remover ferramentas antigas
  await prisma.agentTemplateTools.deleteMany({
    where: { templateId }
  });

  // Adicionar novas ferramentas
  for (const toolId of toolIds) {
    await prisma.agentTemplateTools.create({
      data: {
        templateId,
        toolId
      }
    });
  }

  return await getTemplateById(templateId);
}

/**
 * Remove template personalizado
 */
async function deleteCustomTemplate(templateId, userId) {
  const template = await prisma.agentTemplate.findFirst({
    where: { 
      id: templateId,
      userId: userId,
      isSystem: false
    }
  });

  if (!template) {
    throw new Error('Template não encontrado ou não pertence ao usuário');
  }

  // Verificar se há agentes usando este template
  const agentsUsingTemplate = await prisma.agent.count({
    where: { templateId }
  });

  if (agentsUsingTemplate > 0) {
    throw new Error('Não é possível deletar template em uso por agentes');
  }

  await prisma.agentTemplate.delete({
    where: { id: templateId }
  });

  return { success: true };
}

module.exports = {
  createSystemTemplates,
  createCustomTemplate,
  getAvailableTemplates,
  getTemplateById,
  updateCustomTemplate,
  deleteCustomTemplate
};

// src/services/tools.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cria ferramentas padrão do sistema
 */
async function createSystemTools() {
  const systemTools = [
    {
      name: 'getProductInfo',
      description: 'Busca informações detalhadas sobre produtos no banco de dados',
      type: 'DATABASE',
      config: {
        table: 'products',
        searchFields: ['name', 'description', 'category'],
        returnFields: ['id', 'name', 'description', 'price', 'category', 'stock']
      }
    },
    {
      name: 'getSalesData',
      description: 'Consulta dados de vendas e histórico de transações',
      type: 'DATABASE',
      config: {
        table: 'sales',
        searchFields: ['product_id', 'date', 'customer_id'],
        returnFields: ['id', 'product_id', 'quantity', 'total', 'date', 'status']
      }
    },
    {
      name: 'checkPromotion',
      description: 'Verifica promoções ativas para produtos',
      type: 'DATABASE',
      config: {
        table: 'promotions',
        searchFields: ['product_id', 'active'],
        returnFields: ['id', 'product_id', 'discount_percent', 'start_date', 'end_date']
      }
    },
    {
      name: 'searchKnowledgeBase',
      description: 'Busca informações na base de conhecimento',
      type: 'DATABASE',
      config: {
        table: 'knowledge_base',
        searchFields: ['title', 'content', 'category'],
        returnFields: ['id', 'title', 'content', 'category', 'tags']
      }
    },
    {
      name: 'createTicket',
      description: 'Cria um ticket de suporte técnico',
      type: 'DATABASE',
      config: {
        table: 'support_tickets',
        action: 'create',
        requiredFields: ['customer_phone', 'subject', 'description', 'priority']
      }
    },
    {
      name: 'checkOrderStatus',
      description: 'Verifica o status de um pedido',
      type: 'DATABASE',
      config: {
        table: 'orders',
        searchFields: ['id', 'customer_phone', 'tracking_code'],
        returnFields: ['id', 'status', 'tracking_code', 'estimated_delivery', 'items']
      }
    },
    {
      name: 'getCompanyInfo',
      description: 'Busca informações sobre a empresa',
      type: 'DATABASE',
      config: {
        table: 'company_info',
        searchFields: ['category', 'active'],
        returnFields: ['id', 'category', 'title', 'content', 'contact_info']
      }
    },
    {
      name: 'getProductCatalog',
      description: 'Busca catálogo completo de produtos',
      type: 'DATABASE',
      config: {
        table: 'products',
        searchFields: ['active', 'category'],
        returnFields: ['id', 'name', 'description', 'price', 'category', 'image_url']
      }
    },
    {
      name: 'getPolicies',
      description: 'Busca políticas da empresa (devolução, privacidade, etc.)',
      type: 'DATABASE',
      config: {
        table: 'policies',
        searchFields: ['type', 'active'],
        returnFields: ['id', 'type', 'title', 'content', 'last_updated']
      }
    },
    {
      name: 'checkAvailability',
      description: 'Verifica disponibilidade de horários para agendamento',
      type: 'DATABASE',
      config: {
        table: 'availability_slots',
        searchFields: ['date', 'available'],
        returnFields: ['id', 'date', 'start_time', 'end_time', 'available']
      }
    },
    {
      name: 'scheduleAppointment',
      description: 'Agenda um compromisso ou consulta',
      type: 'DATABASE',
      config: {
        table: 'appointments',
        action: 'create',
        requiredFields: ['customer_phone', 'date', 'time', 'service_type']
      }
    },
    {
      name: 'sendReminder',
      description: 'Envia lembretes de agendamento',
      type: 'WEBHOOK',
      config: {
        url: '/api/webhooks/send-reminder',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    },
    {
      name: 'checkPaymentStatus',
      description: 'Verifica status de pagamentos',
      type: 'DATABASE',
      config: {
        table: 'payments',
        searchFields: ['order_id', 'customer_phone', 'payment_id'],
        returnFields: ['id', 'order_id', 'status', 'amount', 'payment_method', 'date']
      }
    },
    {
      name: 'generateInvoice',
      description: 'Gera fatura ou boleto',
      type: 'API',
      config: {
        endpoint: '/api/financial/generate-invoice',
        method: 'POST',
        requiredFields: ['customer_id', 'items', 'total']
      }
    },
    {
      name: 'processPayment',
      description: 'Processa pagamento',
      type: 'API',
      config: {
        endpoint: '/api/financial/process-payment',
        method: 'POST',
        requiredFields: ['payment_method', 'amount', 'order_id']
      }
    }
  ];

  for (const tool of systemTools) {
    const existingTool = await prisma.tool.findFirst({
      where: { name: tool.name }
    });

    if (!existingTool) {
      await prisma.tool.create({
        data: {
          name: tool.name,
          description: tool.description,
          type: tool.type,
          config: tool.config,
          isSystem: true
        }
      });
    }
  }
}

/**
 * Executa uma ferramenta
 */
async function executeToolFunction(tool, input, agentConfig = {}) {
  switch (tool.type) {
    case 'DATABASE':
      return await executeDatabaseTool(tool, input, agentConfig);
    case 'API':
      return await executeApiTool(tool, input, agentConfig);
    case 'WEBHOOK':
      return await executeWebhookTool(tool, input, agentConfig);
    case 'GENKIT_FLOW':
      return await executeGenkitFlow(tool, input, agentConfig);
    default:
      throw new Error(`Tipo de ferramenta não suportado: ${tool.type}`);
  }
}

/**
 * Executa ferramenta de banco de dados
 */
async function executeDatabaseTool(tool, input, agentConfig) {
  const config = { ...tool.config, ...agentConfig };
  
  // Implementação simplificada - você pode expandir baseado nas suas necessidades
  switch (config.action || 'search') {
    case 'search':
      return await searchInDatabase(config, input);
    case 'create':
      return await createInDatabase(config, input);
    case 'update':
      return await updateInDatabase(config, input);
    default:
      throw new Error(`Ação não suportada: ${config.action}`);
  }
}

/**
 * Busca no banco de dados
 */
async function searchInDatabase(config, input) {
  const { table, searchFields, returnFields } = config;
  
  // Construir query dinamicamente baseada no input
  const searchTerms = extractSearchTerms(input);
  
  // Exemplo com Prisma raw query (adapte conforme sua estrutura)
  const query = `
    SELECT ${returnFields.join(', ')} 
    FROM ${table} 
    WHERE ${searchFields.map(field => `${field} ILIKE '%${searchTerms}%'`).join(' OR ')}
    LIMIT 10
  `;
  
  try {
    const results = await prisma.$queryRawUnsafe(query);
    return results;
  } catch (error) {
    console.error('Erro na busca no banco:', error);
    throw new Error('Erro ao buscar dados no banco de dados');
  }
}

/**
 * Cria registro no banco de dados
 */
async function createInDatabase(config, input) {
  const { table, requiredFields } = config;
  
  // Extrair dados do input
  const data = extractDataFromInput(input, requiredFields);
  
  // Validar campos obrigatórios
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Campo obrigatório não encontrado: ${field}`);
    }
  }
  
  // Criar registro (adapte conforme sua estrutura)
  try {
    const result = await prisma[table].create({ data });
    return result;
  } catch (error) {
    console.error('Erro ao criar registro:', error);
    throw new Error('Erro ao criar registro no banco de dados');
  }
}

/**
 * Executa ferramenta de API
 */
async function executeApiTool(tool, input, agentConfig) {
  const config = { ...tool.config, ...agentConfig };
  const { endpoint, method, requiredFields } = config;
  
  const data = extractDataFromInput(input, requiredFields);
  
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(data)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro na chamada da API:', error);
    throw new Error('Erro ao executar API');
  }
}

/**
 * Executa webhook
 */
async function executeWebhookTool(tool, input, agentConfig) {
  const config = { ...tool.config, ...agentConfig };
  const { url, method, headers } = config;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ input, timestamp: new Date().toISOString() })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro no webhook:', error);
    throw new Error('Erro ao executar webhook');
  }
}

/**
 * Executa flow do Genkit
 */
async function executeGenkitFlow(tool, input, agentConfig) {
  // Implementar integração com Genkit flows
  // Este é um exemplo conceitual
  try {
    const { runFlow } = require('@genkit-ai/flow');
    const result = await runFlow(tool.config.flowName, input);
    return result;
  } catch (error) {
    console.error('Erro no Genkit flow:', error);
    throw new Error('Erro ao executar flow do Genkit');
  }
}

/**
 * Extrai termos de busca do input
 */
function extractSearchTerms(input) {
  // Implementação básica - pode ser melhorada com NLP
  return input.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

/**
 * Extrai dados estruturados do input
 */
function extractDataFromInput(input, requiredFields) {
  // Implementação básica - pode usar NLP para extrair dados
  const data = {};
  
  // Exemplo simples de extração
  for (const field of requiredFields) {
    if (input.toLowerCase().includes(field)) {
      // Lógica para extrair valor do campo
      data[field] = extractFieldValue(input, field);
    }
  }
  
  return data;
}

/**
 * Extrai valor de um campo específico
 */
function extractFieldValue(input, field) {
  // Implementação básica - pode ser melhorada
  const patterns = {
    'customer_phone': /(\+?\d{2}\s?\d{4,5}-?\d{4})/,
    'email': /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    'date': /(\d{2}\/\d{2}\/\d{4})/,
    'time': /(\d{2}:\d{2})/
  };
  
  const pattern = patterns[field];
  if (pattern) {
    const match = input.match(pattern);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * Lista todas as ferramentas disponíveis
 */
async function getAllTools() {
  return await prisma.tool.findMany({
    orderBy: {
      name: 'asc'
    }
  });
}

/**
 * Busca ferramenta por ID
 */
async function getToolById(toolId) {
  return await prisma.tool.findUnique({
    where: { id: toolId }
  });
}

/**
 * Cria ferramenta personalizada
 */
async function createCustomTool(data) {
  const { name, description, type, config } = data;
  
  return await prisma.tool.create({
    data: {
      name,
      description,
      type,
      config,
      isSystem: false
    }
  });
}

module.exports = {
  createSystemTools,
  executeToolFunction,
  executeDatabaseTool,
  executeApiTool,
  executeWebhookTool,
  executeGenkitFlow,
  getAllTools,
  getToolById,
  createCustomTool
};

// src/services/agent.analytics.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Analisa performance dos agentes
 */
async function getAgentPerformanceAnalytics(instanceId, organizationId = null, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const executions = await prisma.agentExecution.findMany({
    where: {
      instanceId,
      createdAt: {
        gte: startDate
      }
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          type: true,
          template: {
            select: {
              name: true,
              category: true
            }
          }
        }
      }
    }
  });

  // Agrupar por agente
  const agentStats = {};
  
  executions.forEach(execution => {
    const agentId = execution.agentId;
    if (!agentStats[agentId]) {
      agentStats[agentId] = {
        agent: execution.agent,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        mostUsedTools: {},
        errorMessages: []
      };
    }

    const stats = agentStats[agentId];
    stats.totalExecutions++;
    
    if (execution.success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
      if (execution.errorMessage) {
        stats.errorMessages.push(execution.errorMessage);
      }
    }

    if (execution.executionTime) {
      stats.totalExecutionTime += execution.executionTime;
    }

    // Contar ferramentas utilizadas
    if (execution.toolsUsed && Array.isArray(execution.toolsUsed)) {
      execution.toolsUsed.forEach(toolId => {
        stats.mostUsedTools[toolId] = (stats.mostUsedTools[toolId] || 0) + 1;
      });
    }
  });

  // Calcular médias
  Object.keys(agentStats).forEach(agentId => {
    const stats = agentStats[agentId];
    stats.successRate = (stats.successfulExecutions / stats.totalExecutions * 100).toFixed(2);
    stats.averageExecutionTime = stats.totalExecutions > 0 
      ? Math.round(stats.totalExecutionTime / stats.totalExecutions)
      : 0;
  });

  return agentStats;
}

/**
 * Analisa tendências de uso
 */
async function getUsageTrends(instanceId, organizationId = null, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const executions = await prisma.agentExecution.findMany({
    where: {
      instanceId,
      createdAt: {
        gte: startDate
      }
    },
    select: {
      createdAt: true,
      success: true,
      executionTime: true,
      agentId: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Agrupar por dia
  const dailyStats = {};
  
  executions.forEach(execution => {
    const date = execution.createdAt.toISOString().split('T')[0];
    
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0
      };
    }

    const stats = dailyStats[date];
    stats.totalExecutions++;
    
    if (execution.success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    if (execution.executionTime) {
      stats.totalExecutionTime += execution.executionTime;
    }
  });

  // Calcular médias
  Object.keys(dailyStats).forEach(date => {
    const stats = dailyStats[date];
    stats.averageExecutionTime = stats.totalExecutions > 0 
      ? Math.round(stats.totalExecutionTime / stats.totalExecutions)
      : 0;
    stats.successRate = (stats.successfulExecutions / stats.totalExecutions * 100).toFixed(2);
  });

  return Object.values(dailyStats);
}

/**
 * Identifica gargalos e problemas
 */
async function identifyBottlenecks(instanceId, organizationId = null, timeRange = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const executions = await prisma.agentExecution.findMany({
    where: {
      instanceId,
      createdAt: {
        gte: startDate
      }
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  const issues = [];

  // Identificar agentes com alta taxa de falha
  const agentFailures = {};
  executions.forEach(execution => {
    const agentId = execution.agentId;
    if (!agentFailures[agentId]) {
      agentFailures[agentId] = {
        agent: execution.agent,
        total: 0,
        failures: 0
      };
    }
    
    agentFailures[agentId].total++;
    if (!execution.success) {
      agentFailures[agentId].failures++;
    }
  });

  Object.keys(agentFailures).forEach(agentId => {
    const stats = agentFailures[agentId];
    const failureRate = (stats.failures / stats.total * 100);
    
    if (failureRate > 20) { // Mais de 20% de falhas
      issues.push({
        type: 'HIGH_FAILURE_RATE',
        severity: failureRate > 50 ? 'CRITICAL' : 'WARNING',
        agent: stats.agent,
        message: `Agente ${stats.agent.name} tem taxa de falha de ${failureRate.toFixed(2)}%`,
        data: stats
      });
    }
  });

  // Identificar tempos de execução altos
  const slowExecutions = executions.filter(ex => ex.executionTime > 10000); // Mais de 10 segundos
  
  if (slowExecutions.length > 0) {
    const slowAgents = {};
    slowExecutions.forEach(execution => {
      const agentId = execution.agentId;
      if (!slowAgents[agentId]) {
        slowAgents[agentId] = {
          agent: execution.agent,
          count: 0,
          averageTime: 0,
          totalTime: 0
        };
      }
      slowAgents[agentId].count++;
      slowAgents[agentId].totalTime += execution.executionTime;
    });

    Object.keys(slowAgents).forEach(agentId => {
      const stats = slowAgents[agentId];
      stats.averageTime = stats.totalTime / stats.count;
      
      issues.push({
        type: 'SLOW_EXECUTION',
        severity: stats.averageTime > 30000 ? 'CRITICAL' : 'WARNING',
        agent: stats.agent,
        message: `Agente ${stats.agent.name} tem tempo médio de execução de ${Math.round(stats.averageTime/1000)}s`,
        data: stats
      });
    });
  }

  return issues;
}

/**
 * Gera relatório de otimização
 */
async function generateOptimizationReport(instanceId, organizationId = null) {
  const performance = await getAgentPerformanceAnalytics(instanceId, organizationId);
  const trends = await getUsageTrends(instanceId, organizationId);
  const bottlenecks = await identifyBottlenecks(instanceId, organizationId);

  const recommendations = [];

  // Analisar performance e gerar recomendações
  Object.values(performance).forEach(stats => {
    if (stats.successRate < 80) {
      recommendations.push({
        type: 'IMPROVE_RELIABILITY',
        priority: 'HIGH',
        agent: stats.agent,
        message: `Considere revisar o agente ${stats.agent.name} - taxa de sucesso: ${stats.successRate}%`,
        suggestions: [
          'Revisar prompts e personas',
          'Verificar configurações de ferramentas',
          'Analisar logs de erro',
          'Ajustar timeouts e retry logic'
        ]
      });
    }

    if (stats.averageExecutionTime > 5000) {
      recommendations.push({
        type: 'OPTIMIZE_PERFORMANCE',
        priority: 'MEDIUM',
        agent: stats.agent,
        message: `Agente ${stats.agent.name} pode ser otimizado - tempo médio: ${Math.round(stats.averageExecutionTime/1000)}s`,
        suggestions: [
          'Otimizar queries de banco de dados',
          'Reduzir número de ferramentas ativas',
          'Implementar cache para consultas frequentes',
          'Revisar configurações de modelo LLM'
        ]
      });
    }
  });

  return {
    performance,
    trends,
    bottlenecks,
    recommendations,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  getAgentPerformanceAnalytics,
  getUsageTrends,
  identifyBottlenecks,
  generateOptimizationReport
};

```