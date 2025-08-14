import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import qrcode from 'qrcode';
import * as webSocketService from './websocket.service.js';
import * as ariacService from './ariac.service.js'; // Importar o novo serviço Ariac
import { PrismaClient } from '@prisma/client';
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
  console.log(`✉️  Mensagem recebida para ${client.options.authStrategy.clientId}: ${message.body}`);

  if (message.isStatus || message.from.includes('@g.us')) return;

  const clientId = client.options.authStrategy.clientId;

  try {
    const instance = await prisma.instance.findUnique({ where: { clientId } });
    if (!instance) {
      console.error(`Instância com clientId ${clientId} não encontrada.`);
      return;
    }

    const wppContact = await message.getContact();
    const contact = await prisma.contact.upsert({
      where: { instanceId_phoneNumber: { instanceId: instance.id, phoneNumber: `+${message.from.split('@')[0]}` } },
      update: {
        name: wppContact.name,
        pushName: wppContact.pushname,
      },
      create: {
        instanceId: instance.id,
        phoneNumber: `+${message.from.split('@')[0]}`,
        name: wppContact.name,
        pushName: wppContact.pushname,
      },
    });

    // Salva a mensagem recebida (INCOMING)
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: message.id.id,
        direction: 'INCOMING',
        content: message.body,
        status: 'read',
        isRead: true,
      },
    });

    // Chama o serviço Ariac para obter a resposta do agente
    const chatData = {
      user_id: instance.userId,
      instance_id: instance.id,
      whatsapp_number: `+${message.from.split('@')[0]}`,
      username: wppContact.pushname || wppContact.name,
      message: message.body,
    };

    const agentResponse = await ariacService.chatWithAgent(chatData);

    if (!agentResponse || !agentResponse.response) {
      throw new Error("A resposta do agente Ariac estava vazia ou malformada.");
    }

    const finalResponse = agentResponse.response;

    // Envia a resposta e a salva no banco de dados (OUTGOING)
    const sentMessage = await client.sendMessage(message.from, finalResponse);
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: sentMessage.id.id,
        direction: 'OUTGOING',
        content: finalResponse,
        status: 'sent',
        // O agentExecutionId não é mais gerado localmente
      },
    });

  } catch (error) {
    console.error('Erro ao processar mensagem do WhatsApp com o serviço Ariac:', error);
    client.sendMessage(message.from, 'Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.');
  }
}

async function startInstance(clientId, isReconnection = false) {
  if (activeClients[clientId]) {
    console.log(`ℹ️ Instância ${clientId} já está em processo de conexão.`);
    return activeClients[clientId];
  }

  console.log(`🚀 Iniciando instância ${clientId}. É uma reconexão? ${isReconnection}`);

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

  activeClients[clientId] = client;

  const initialStatus = isReconnection ? 'RECONNECTING' : 'PENDING_QR';
  const initialMessage = isReconnection ? `Reconectando instância ${clientId}...` : `Aguardando leitura do QR Code para a instância ${clientId}.`;
  updateInstanceStatus(clientId, initialStatus, initialMessage);

  client.on('qr', async (qr) => {
    if (isReconnection) {
      console.warn(`⚠️ Sessão para ${clientId} é inválida. Requer novo QR Code. Desconectando...`);
      await client.destroy();
    } else {
      const qrImage = await qrcode.toDataURL(qr);
      console.log(`🔑 QR Code gerado para ${clientId}. Enviando via WebSocket.`);
      webSocketService.broadcast({
        type: 'qr_code',
        clientId,
        data: qrImage,
      });
    }
  });

  client.on('ready', () => {
    console.log(`✅ Instância WhatsApp ${clientId} conectada!`);
    updateInstanceStatus(clientId, 'CONNECTED', `Instância ${clientId} conectada com sucesso.`);
  });

  client.on('message', (message) => _handleIncomingWhatsAppMessage(client, message));

  client.on('disconnected', (reason) => {
    console.log(`🔌 Instância WhatsApp ${clientId} desconectada. Razão: ${reason}`);
    const wasBeingDeleted = activeClients[clientId]?.isBeingDeleted;
    delete activeClients[clientId];
    if (!wasBeingDeleted) {
      updateInstanceStatus(clientId, 'DISCONNECTED', `Instância ${clientId} foi desconectada.`);
    }
  });

  client.on('remote_session_saved', () => {
    console.log(`💾 Sessão do ${clientId} salva no MongoDB`);
  });

  client.initialize().catch(error => {
    console.error(`❌ Falha ao inicializar a instância ${clientId}:`, error);
    delete activeClients[clientId];
    updateInstanceStatus(clientId, 'DISCONNECTED', `Falha ao inicializar a instância ${clientId}.`);
  });

  return client;
}

async function disconnectInstance(clientId, isBeingDeleted = false) {
  const client = activeClients[clientId];
  if (client) {
    if (isBeingDeleted) {
      client.isBeingDeleted = true;
    }
    await client.logout();
    return true;
  }

  const instance = await prisma.instance.findUnique({ where: { clientId } });
  if (instance && instance.status !== 'DISCONNECTED' && !isBeingDeleted) {
    updateInstanceStatus(clientId, 'DISCONNECTED', `Instância ${clientId} foi desconectada.`);
  }

  return false;
}

export {
  startInstance,
  activeClients,
  disconnectInstance,
};
