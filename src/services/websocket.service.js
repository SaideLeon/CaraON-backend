import { WebSocketServer } from 'ws';
import { executeHierarchicalAgentFlow, executeHierarchicalAgentFlowStream } from './agent.execution.service.js';
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
              type: 'ROUTER',
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
              type: 'ROUTER', // Adicionado o tipo explicitamente aqui
            });
            console.log(`✅ Agente Roteador Principal criado automaticamente para a instância ${instance.name} via playground.`);
          }

          // Define o callback para o streaming
          const streamCallback = (chunk) => {
            ws.send(JSON.stringify({
              type: 'playground_response_chunk',
              chunk: chunk,
            }));
          };

          // Chama a nova função de fluxo com streaming
          const { finalResponse, executionId } = await executeHierarchicalAgentFlowStream(
            instanceId,
            messageContent,
            userPhone || `playground_user_${instanceId}`,
            streamCallback
          );

          // Envia uma mensagem final para indicar que a resposta está completa
          ws.send(JSON.stringify({
            type: 'playground_response_complete',
            response: { finalResponse, executionId },
          }));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem do WebSocket:', error);
        ws.send(JSON.stringify({
          type: 'playground_error',
          error: error.message,
          executionId: error.executionId || null,
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