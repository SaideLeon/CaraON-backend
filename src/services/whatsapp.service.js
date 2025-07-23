require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
const webSocketService = require('./websocket.service');
const { executeHierarchicalAgentFlow } = require('./agent.execution.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const activeClients = {};

mongoose.connect(process.env.MONGODB_SESSION_URI);
const store = new MongoStore({ mongoose });

async function updateInstanceStatus(clientId, status, message = null) {
  try {
    await prisma.instance.update({ where: { clientId }, data: { status } });
    webSocketService.broadcast({
      type: 'instance_status',
      clientId,
      status,
      message: message || `Instância ${clientId} agora está ${status}`,
    });
    console.log(`Status da instância ${clientId} atualizado para: ${status}`);
  } catch (error) {
    console.error(`Falha ao atualizar o status da instância ${clientId}:`, error);
  }
}

async function _handleIncomingWhatsAppMessage(client, message) {
  console.log(`✉️ Mensagem recebida para ${client.options.authStrategy.clientId}: ${message.body}`);

  if (message.isStatus || message.from.includes('@g.us')) return;

  const clientId = client.options.authStrategy.clientId;

  try {
    const instance = await prisma.instance.findUnique({ where: { clientId } });
    if (!instance) return;

    // TODO: Implementar a lógica para determinar a organização (se houver)
    const organizationId = null; 

    const agentResponse = await executeHierarchicalAgentFlow(
      instance.id,
      organizationId,
      message.body,
      message.from
    );

    client.sendMessage(message.from, agentResponse);

  } catch (error) {
    console.error('Erro ao processar mensagem do WhatsApp:', error);
    client.sendMessage(message.from, 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
  }
}

async function startInstance(clientId) {
  if (activeClients[clientId]) {
    console.log(`ℹ️ Instância ${clientId} já em execução`);
    return activeClients[clientId];
  }

  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      clientId,
      backupSyncIntervalMs: 300000,
    }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    },
  });

  updateInstanceStatus(clientId, 'PENDING_QR', `Aguardando leitura do QR Code para a instância ${clientId}.`);

  client.on('qr', async (qr) => {
    const qrImage = await qrcode.toDataURL(qr);
    console.log(`🔑 QR Code gerado para ${clientId}. Enviando via WebSocket.`);
    webSocketService.broadcast({
      type: 'qr_code',
      clientId,
      data: qrImage,
    });
  });

  client.on('ready', () => {
    console.log(`✅ Instância WhatsApp ${clientId} conectada!`);
    updateInstanceStatus(clientId, 'CONNECTED', `Instância ${clientId} conectada com sucesso.`);
  });

  client.on('message', (message) => _handleIncomingWhatsAppMessage(client, message));

  client.on('disconnected', (reason) => {
    console.log(`🔌 Instância WhatsApp ${clientId} desconectada. Razão: ${reason}`);
    delete activeClients[clientId];
    updateInstanceStatus(clientId, 'DISCONNECTED', `Instância ${clientId} foi desconectada.`);
  });

  client.on('remote_session_saved', () => {
    console.log(`💾 Sessão do ${clientId} salva no MongoDB`);
  });

  client.initialize();
  activeClients[clientId] = client;

  return client;
}

async function disconnectInstance(clientId) {
  const client = activeClients[clientId];
  if (client) {
    await client.logout();
    // O evento 'disconnected' tratará a limpeza e atualização de status
    return true;
  }

  // Se o cliente não estiver ativo, garante que o status seja atualizado
  const instance = await prisma.instance.findUnique({ where: { clientId } });
  if (instance && instance.status !== 'DISCONNECTED') {
    updateInstanceStatus(clientId, 'DISCONNECTED', `Instância ${clientId} foi desconectada.`);
  }

  return false;
}

module.exports = {
  startInstance,
  activeClients,
  disconnectInstance,
};
