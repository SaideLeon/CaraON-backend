import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import * as ariacService from './ariac.service.js';

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

          const chatData = {
            user_id: instance.userId,
            instance_id: instance.id,
            whatsapp_number: userPhone || `playground_user_${instanceId}`,
            username: 'Playground User',
            message: messageContent,
          };
    
          const agentResponse = await ariacService.chatWithAgent(chatData);
    
          if (!agentResponse || !agentResponse.response) {
            throw new Error("A resposta do agente Ariac estava vazia ou malformada.");
          }

          // Envia a resposta completa de uma só vez
          ws.send(JSON.stringify({
            type: 'playground_response_complete',
            response: { 
              finalResponse: agentResponse.response, 
              executionId: agentResponse.session_id 
            },
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