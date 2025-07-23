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