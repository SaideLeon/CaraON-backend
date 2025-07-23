const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
    updateAgentPersonaSchema, 
    createParentAgentSchema, 
    createChildAgentFromTemplateSchema, 
    createCustomChildAgentSchema, 
    listChildAgentsSchema, 
    exportAgentAnalyticsSchema,
    listParentAgentsSchema
} = require('../schemas/agent.schema');
const { z } = require('zod');
const agentHierarchyService = require('../services/agent.hierarchy.service');
const agentAnalyticsService = require('../services/agent.analytics.service');
const { Parser } = require('json2csv');

exports.updateAgentPersona = async (req, res) => {
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

exports.createParentAgent = async (req, res) => {
    const { instanceId, organizationId } = req.params;
    const { name, persona } = req.body;
    const { userId } = req.user;

    try {
        const agent = await agentHierarchyService.createParentAgent({
            name,
            persona,
            instanceId,
            organizationId,
            userId,
        });
        res.status(201).json(agent);
    } catch (error) {
        console.error("Erro ao criar agente pai:", error);
        res.status(500).json({ error: 'Falha ao criar o agente pai.' });
    }
};

exports.createChildAgentFromTemplate = async (req, res) => {
    const { parentAgentId } = req.params;
    const { name, templateId, customPersona } = req.body;

    try {
        const parentAgent = await prisma.agent.findUnique({ where: { id: parentAgentId } });
        if (!parentAgent) {
            return res.status(404).json({ error: 'Agente pai não encontrado' });
        }

        const agent = await agentHierarchyService.createChildAgentFromTemplate({
            name,
            templateId,
            customPersona,
            parentAgentId,
            instanceId: parentAgent.instanceId,
            organizationId: parentAgent.organizationId,
        });
        res.status(201).json(agent);
    } catch (error) {
        console.error("Erro ao criar agente filho a partir de template:", error);
        res.status(500).json({ error: 'Falha ao criar o agente filho.' });
    }
};

exports.createCustomChildAgent = async (req, res) => {
    const { parentAgentId } = req.params;
    const { name, persona, toolIds } = req.body;

    try {
        const parentAgent = await prisma.agent.findUnique({ where: { id: parentAgentId } });
        if (!parentAgent) {
            return res.status(404).json({ error: 'Agente pai não encontrado' });
        }

        const agent = await agentHierarchyService.createCustomChildAgent({
            name,
            persona,
            toolIds,
            parentAgentId,
            instanceId: parentAgent.instanceId,
            organizationId: parentAgent.organizationId,
        });
        res.status(201).json(agent);
    } catch (error) {
        console.error("Erro ao criar agente filho customizado:", error);
        res.status(500).json({ error: 'Falha ao criar o agente filho customizado.' });
    }
};


exports.listChildAgents = async (req, res) => {
    const { parentAgentId } = req.params;

    try {
        const agents = await agentHierarchyService.getChildAgents(parentAgentId);
        res.status(200).json(agents);
    } catch (error) {
        console.error("Erro ao listar agentes filhos:", error);
        res.status(500).json({ error: 'Falha ao listar os agentes filhos.' });
    }
};

exports.getAgentById = async (req, res) => {
    const { agentId } = req.params;

    try {
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                tools: true,
                parent: true,
                children: true,
            },
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agente não encontrado.' });
        }

        res.status(200).json(agent);
    } catch (error) {
        console.error("Erro ao buscar agente por ID:", error);
        res.status(500).json({ error: 'Falha ao buscar o agente.' });
    }
};

exports.exportAgentAnalytics = async (req, res) => {
    const { instanceId, organizationId } = req.query;

    try {
        const report = await agentAnalyticsService.generateOptimizationReport(instanceId, organizationId);
        res.status(200).json(report);
    } catch (error) {
        console.error("Erro ao exportar análise de agentes:", error);
        res.status(500).json({ error: 'Falha ao exportar a análise de agentes.' });
    }
};

exports.exportAgentAnalyticsCsv = async (req, res) => {
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
        console.error("Erro ao exportar análise de agentes para CSV:", error);
        res.status(500).json({ error: 'Falha ao exportar a análise de agentes para CSV.' });
    }
};

exports.listParentAgents = async (req, res) => {
    const { instanceId } = req.params;

    try {
        const agents = await prisma.agent.findMany({
            where: {
                instanceId: instanceId,
                type: 'PAI',
                isActive: true,
            },
            include: {
                organization: true,
                childAgents: true,
            }
        });
        res.status(200).json(agents);
    } catch (error) {
        console.error("Erro ao listar agentes pais:", error);
        res.status(500).json({ error: 'Falha ao listar os agentes pais.' });
    }
};