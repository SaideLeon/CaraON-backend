import { WebSocketServer } from 'ws';
import { executeHierarchicalAgentFlow } from './agent.execution.service.js';
import { PrismaClient } from '@prisma/client';
import * as agentHierarchyService from './agent.hierarchy.service.js';

const prisma = new PrismaClient();
let wss;

function init(server) {
  wss = new WebSocketServer({ server });
  console.log('✅ Servidor WebSocket iniciado');

  wss.on('connection', (ws) => {
    console.log('🔗 Novo cliente WebSocket conectado');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'playground_test') {
          console.log(`▶️ Teste de playground recebido para a instância: ${data.instanceId}`);
          
          const { instanceId, messageContent, userPhone } = data;

          // Etapa de Auto-Correção para o Playground
          const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
          if (!instance) {
            throw new Error(`Instância com ID ${instanceId} não encontrada para o teste de playground.`);
          }

          let routerAgent = await prisma.agent.findFirst({
            where: {
              instanceId: instance.id,
              type: 'PAI',
              organizationId: null,
            },
          });

          if (!routerAgent) {
            console.warn(`⚠️ Nenhum Agente Roteador Principal encontrado para a instância ${instance.name} no playground. Criando um automaticamente.`);
            routerAgent = await agentHierarchyService.createParentAgent({
              name: `Roteador - ${instance.name}`,
              persona: 'Você é o agente roteador principal. Sua função é analisar a mensagem do usuário e direcioná-la para o departamento ou especialista correto (Vendas, Suporte, etc.). Se não tiver certeza, peça ao usuário para esclarecer.',
              instanceId: instance.id,
              organizationId: null,
              userId: instance.userId,
            });
            console.log(`✅ Agente Roteador Principal criado automaticamente para a instância ${instance.name} via playground.`);
          }

          const agentResponse = await executeHierarchicalAgentFlow(
            instanceId,
            messageContent,
            userPhone || 'playground_user' // Identificador para o teste
          );

          // Envia a resposta de volta para o cliente que solicitou
          ws.send(JSON.stringify({
            type: 'playground_response',
            response: agentResponse,
          }));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem do WebSocket:', error);
        ws.send(JSON.stringify({
          type: 'playground_error',
          error: error.message,
        }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 Cliente WebSocket desconectado');
    });
  });
}

function broadcast(data) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function isReady() {
  return !!wss;
}

export {
  init,
  broadcast,
  isReady,
};