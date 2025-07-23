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