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
      name: 'createTicket',
      description: 'Cria um ticket de suporte técnico',
      type: 'DATABASE',
      config: {
        table: 'support_tickets',
        action: 'create',
        requiredFields: ['customer_phone', 'subject', 'description', 'priority']
      }
    },
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
 * Executa uma ferramenta com base nos parâmetros extraídos pelo LLM.
 * @param {object} tool - O objeto da ferramenta a ser executada.
 * @param {object} parameters - Os parâmetros extraídos pelo LLM.
 * @param {object} [agentConfig={}] - Configurações adicionais do agente.
 * @returns {Promise<any>} O resultado da execução da ferramenta.
 */
async function executeToolFunction(tool, parameters, agentConfig = {}) {
  switch (tool.type) {
    case 'DATABASE':
      return await executeDatabaseTool(tool, parameters, agentConfig);
    case 'API':
      return await executeApiTool(tool, parameters, agentConfig);
    case 'WEBHOOK':
      return await executeWebhookTool(tool, parameters, agentConfig);
    case 'GENKIT_FLOW':
      return await executeGenkitFlow(tool, parameters, agentConfig);
    default:
      throw new Error(`Tipo de ferramenta não suportado: ${tool.type}`);
  }
}

/**
 * Executa uma ferramenta do tipo DATABASE.
 */
async function executeDatabaseTool(tool, parameters, agentConfig) {
  const config = { ...tool.config, ...agentConfig };
  const action = config.action || 'search';

  switch (action) {
    case 'search':
      return await searchInDatabase(config, parameters);
    case 'create':
      return await createInDatabase(config, parameters);
    case 'update':
      return await updateInDatabase(config, parameters);
    default:
      throw new Error(`Ação de banco de dados não suportada: ${action}`);
  }
}

/**
 * Realiza uma busca no banco de dados com base nos parâmetros fornecidos.
 */
async function searchInDatabase(config, parameters) {
  const { table, searchFields, returnFields } = config;
  const modelName = table.charAt(0).toLowerCase() + table.slice(1, -1); // Heurística para converter nome de tabela para nome de modelo Prisma (ex: 'products' -> 'product')

  if (!prisma[modelName]) {
    throw new Error(`Modelo Prisma inválido: ${modelName}`);
  }

  const whereClauses = searchFields.map(field => {
    if (parameters[field]) {
      return { [field]: { contains: parameters[field], mode: 'insensitive' } };
    }
    return null;
  }).filter(Boolean);

  if (whereClauses.length === 0) {
    return []; // Retorna vazio se nenhum parâmetro de busca foi fornecido
  }

  try {
    const results = await prisma[modelName].findMany({
      where: {
        OR: whereClauses,
      },
      select: returnFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
      take: 10,
    });
    return results;
  } catch (error) {
    console.error('Erro na busca no banco de dados:', error);
    throw new Error('Erro ao buscar dados no banco de dados');
  }
}

/**
 * Cria um novo registro no banco de dados.
 */
async function createInDatabase(config, parameters) {
  const { table, requiredFields } = config;
  const modelName = table.charAt(0).toLowerCase() + table.slice(1, -1);

  if (!prisma[modelName]) {
    throw new Error(`Modelo Prisma inválido: ${modelName}`);
  }

  // Validar campos obrigatórios
  for (const field of requiredFields) {
    if (!parameters[field]) {
      throw new Error(`Parâmetro obrigatório ausente para a criação: ${field}`);
    }
  }

  try {
    const result = await prisma[modelName].create({ data: parameters });
    return result;
  } catch (error) {
    console.error('Erro ao criar registro no banco de dados:', error);
    throw new Error('Erro ao criar registro no banco de dados');
  }
}

/**
 * Executa uma ferramenta do tipo API.
 */
async function executeApiTool(tool, parameters, agentConfig) {
  const config = { ...tool.config, ...agentConfig };
  const { endpoint, method, requiredFields } = config;

  // Validar campos obrigatórios
  for (const field of requiredFields) {
    if (!parameters[field]) {
      throw new Error(`Parâmetro obrigatório ausente para a API: ${field}`);
    }
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(parameters),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha na chamada da API: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na chamada da API:', error);
    throw new Error('Erro ao executar a ferramenta de API');
  }
}

/**
 * Executa uma ferramenta do tipo WEBHOOK.
 */
async function executeWebhookTool(tool, parameters, agentConfig) {
    const config = { ...tool.config, ...agentConfig };
    const { url, method, headers } = config;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({ ...parameters, triggeredAt: new Date().toISOString() }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Falha no webhook: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao executar webhook:', error);
        throw new Error('Erro ao executar a ferramenta de webhook');
    }
}

/**
 * Executa um flow do Genkit (conceitual).
 */
async function executeGenkitFlow(tool, parameters, agentConfig) {
  // Esta é uma implementação conceitual e precisa ser adaptada para sua configuração real do Genkit.
  try {
    const { runFlow } = require('@genkit-ai/flow'); // Assumindo que você tem o Genkit configurado
    const result = await runFlow(tool.config.flowName, parameters);
    return result;
  } catch (error) {
    console.error(`Erro ao executar o flow do Genkit '${tool.config.flowName}':`, error);
    throw new Error(`Erro ao executar o flow do Genkit: ${tool.config.flowName}`);
  }
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
  getAllTools,
  getToolById,
  createCustomTool
};
