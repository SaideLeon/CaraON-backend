const WebSocket = require('ws');

let wss;

function init(server) {
  wss = new WebSocket.Server({ server });
  console.log('✅ Servidor WebSocket iniciado');

  wss.on('connection', (ws) => {
    console.log('🔗 Novo cliente WebSocket conectado');
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