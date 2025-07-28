import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { 
  updateAgentPersonaSchema, 
  createAgentSchema, // Schema unificado para criação
  listChildAgentsSchema, 
  exportAgentAnalyticsSchema,
  listParentAgentsSchema,
  deleteAgentSchema,
  updateAgentSchema
} from '../schemas/agent.schema.js';
import * as agentHierarchyService from '../services/agent.hierarchy.service.js';
import * as agentAnalyticsService from '../services/agent.analytics.service.js';
import { Parser } from 'json2csv';

// Cria um Agente (ROUTER, PARENT, ou CHILD)
const createAgent = async (req, res) => {
  const { name, persona, type, toolIds, instanceId, organizationId, parentAgentId } = req.body;
  const { userId } = req.user;

  try {
    let agent;
    if (type === 'CHILD') {
        if (!parentAgentId) {
            return res.status(400).json({ error: 'Agente PAI é obrigatório para criar um agente FILHO.' });
        }
        const parentAgent = await prisma.agent.findUnique({ where: { id: parentAgentId } });
        if (!parentAgent) {
            return res.status(404).json({ error: 'Agente pai não encontrado' });
        }
        agent = await agentHierarchyService.createCustomChildAgent({
            name, persona, toolIds,
            parentAgentId,
            instanceId: parentAgent.instanceId,
            organizationId: parentAgent.organizationId,
        });
    } else { // PARENT ou ROUTER
        agent = await agentHierarchyService.createParentAgent({
            name, persona, type,
            instanceId,
            organizationId,
            userId,
        });
    }
    res.status(201).json(agent);
  } catch (error) {
    console.error(`Erro ao criar agente do tipo ${type}:`, error);
    res.status(500).json({ error: `Falha ao criar o agente ${type}.` });
  }
};


const updateAgentPersona = async (req, res) => {
  const { agentId } = req.params;
  const { persona } = req.body;

  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { persona },
    });
    res.status(200).json(agent);
  } catch (error) {
    if (error.code === 'P2025') { // Not Found error from Prisma
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }
    res.status(500).json({ error: 'Falha ao atualizar a persona do agente.' });
  }
};

const updateAgent = async (req, res) => {
  const { agentId } = req.params;
  const { name, persona, priority } = req.body;

  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { name, persona, priority },
    });
    res.status(200).json(agent);
  } catch (error) {
    if (error.code === 'P2025') { // Not Found error from Prisma
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }
    res.status(500).json({ error: 'Falha ao atualizar o agente.' });
  }
};

const listChildAgents = async (req, res) => {
  const { parentAgentId } = req.params;

  try {
    const agents = await agentHierarchyService.getChildAgents(parentAgentId);
    res.status(200).json(agents);
  } catch (error) {
    console.error('Erro ao listar agentes filhos:', error);
    res.status(500).json({ error: 'Falha ao listar os agentes filhos.' });
  }
};

const getAgentById = async (req, res) => {
  const { agentId } = req.params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        tools: true,
        parentAgent: true,
        childAgents: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }

    res.status(200).json(agent);
  } catch (error) {
    console.error('Erro ao buscar agente por ID:', error);
    res.status(500).json({ error: 'Falha ao buscar o agente.' });
  }
};

const exportAgentAnalytics = async (req, res) => {
  const { instanceId, organizationId } = req.query;

  try {
    const report = await agentAnalyticsService.generateOptimizationReport(instanceId, organizationId);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao exportar análise de agentes:', error);
    res.status(500).json({ error: 'Falha ao exportar a análise de agentes.' });
  }
};

const exportAgentAnalyticsCsv = async (req, res) => {
  const { instanceId, organizationId } = req.query;

  try {
    const report = await agentAnalyticsService.generateOptimizationReport(instanceId, organizationId);
        
    const fields = [
      { label: 'Agent ID', value: 'agent.id' },
      { label: 'Agent Name', value: 'agent.name' },
      { label: 'Total Executions', value: 'totalExecutions' },
      { label: 'Successful Executions', value: 'successfulExecutions' },
      { label: 'Failed Executions', value: 'failedExecutions' },
      { label: 'Success Rate (%)', value: 'successRate' },
      { label: 'Average Execution Time (ms)', value: 'averageExecutionTime' },
    ];

    const data = Object.values(report.performance);

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('agent_analytics.csv');
    res.status(200).send(csv);

  } catch (error) {
    console.error('Erro ao exportar análise de agentes para CSV:', error);
    res.status(500).json({ error: 'Falha ao exportar a análise de agentes para CSV.' });
  }
};

const listParentAgents = async (req, res) => {
  const { instanceId } = req.params;

  try {
    const agents = await prisma.agent.findMany({
      where: {
        instanceId: instanceId,
        type: { in: ['ROUTER', 'PARENT'] }, // Busca por ROUTER e PARENT
        isActive: true,
      },
      include: {
        organization: true,
        childAgents: true,
      }
    });
    res.status(200).json(agents);
  } catch (error) {
    console.error('Erro ao listar agentes pais:', error);
    res.status(500).json({ error: 'Falha ao listar os agentes pais.' });
  }
};

const listUserParentAgents = async (req, res) => {
  const { userId } = req.user;

  try {
    const instances = await prisma.instance.findMany({
      where: { userId: userId },
      select: { id: true }
    });

    const instanceIds = instances.map(instance => instance.id);

    const agents = await prisma.agent.findMany({
      where: {
        instanceId: { in: instanceIds },
        type: { in: ['ROUTER', 'PARENT'] },
        isActive: true,
      },
      include: {
        organization: true,
        childAgents: true,
        instance: true,
      }
    });
    res.status(200).json(agents);
  } catch (error) {
    console.error('Erro ao listar agentes pais do usuário:', error);
    res.status(500).json({ error: 'Falha ao listar os agentes pais do usuário.' });
  }
};

const deleteAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    await agentHierarchyService.deactivateAgent(agentId); // Using deactivateAgent from the service
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar agente:', error);
    if (error.code === 'P2025') { // Not Found error from Prisma
      return res.status(404).json({ error: 'Agente não encontrado.' });
    }
    res.status(500).json({ error: 'Falha ao deletar o agente.' });
  }
};

export default {
  createAgent,
  updateAgentPersona,
  updateAgent,
  listChildAgents,
  getAgentById,
  exportAgentAnalytics,
  exportAgentAnalyticsCsv,
  listParentAgents,
  listUserParentAgents,
  deleteAgent,
};