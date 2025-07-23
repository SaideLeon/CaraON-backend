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