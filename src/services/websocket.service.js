const WebSocket = require('ws');
const { executeHierarchicalAgentFlow } = require('./agent.execution.service');

let wss;

function init(server) {
  wss = new WebSocket.Server({ server });
  console.log('✅ Servidor WebSocket iniciado');

  wss.on('connection', (ws) => {
    console.log('🔗 Novo cliente WebSocket conectado');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'playground_test') {
          console.log(`▶️ Teste de playground recebido para a instância: ${data.instanceId}`);
          
          const { instanceId, organizationId, messageContent, userPhone } = data;

          const agentResponse = await executeHierarchicalAgentFlow(
            instanceId,
            organizationId, // Pode ser null
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

module.exports = {
  init,
  broadcast,
  isReady,
};