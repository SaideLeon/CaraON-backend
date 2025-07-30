import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import qrcode from 'qrcode';
import * as webSocketService from './websocket.service.js';
import { executeHierarchicalAgentFlow } from './agent.execution.service.js';
import * as agentHierarchyService from './agent.hierarchy.service.js'; // Importar o serviço
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

"""async function _handleIncomingWhatsAppMessage(client, message) {
  const clientId = client.options.authStrategy.clientId;
  console.log(`[${clientId}]  ricevuto...`);

  if (message.isStatus || message.from.includes('@g.us')) {
    console.log(`[${clientId}] Ignorando mensagem de status ou de grupo.`);
    return;
  }

  console.log(`[${clientId}] Processando mensagem de ${message.from}: "${message.body}"`);

  try {
    console.log(`[${clientId}] Buscando instância no banco de dados...`);
    const instance = await prisma.instance.findUnique({ where: { clientId } });
    if (!instance) {
      console.error(`[${clientId}] Instância não encontrada no banco de dados.`);
      return;
    }
    console.log(`[${clientId}] Instância encontrada: ${instance.name}`);

    console.log(`[${clientId}] Verificando/criando agente roteador...`);
    let routerAgent = await prisma.agent.findFirst({
      where: {
        instanceId: instance.id,
        type: 'ROUTER',
        organizationId: null,
      },
    });

    if (!routerAgent) {
      console.warn(`[${clientId}] Roteador não encontrado. Criando um novo...`);
      const user = await prisma.user.findUnique({ where: { id: instance.userId } });
      if (user) {
        routerAgent = await agentHierarchyService.createParentAgent({
          name: `Roteador - ${instance.name}`,
          persona: 'Você é o agente roteador principal...',
          instanceId: instance.id,
          organizationId: null,
          userId: user.id,
        });
        console.log(`[${clientId}] Roteador criado com sucesso: ${routerAgent.id}`);
      } else {
        throw new Error(`Usuário da instância ${instance.id} não foi encontrado.`);
      }
    } else {
      console.log(`[${clientId}] Agente roteador encontrado: ${routerAgent.id}`);
    }

    console.log(`[${clientId}] Garantindo que o contato exista (upsert)...`);
    const wppContact = await message.getContact();
    const contact = await prisma.contact.upsert({
      where: { instanceId_phoneNumber: { instanceId: instance.id, phoneNumber: message.from } },
      update: { name: wppContact.name, pushName: wppContact.pushname },
      create: {
        instanceId: instance.id,
        phoneNumber: message.from,
        name: wppContact.name,
        pushName: wppContact.pushname,
      },
    });
    console.log(`[${clientId}] Contato garantido: ${contact.id}`);

    console.log(`[${clientId}] Executando fluxo de agente hierárquico...`);
    const { finalResponse, executionId } = await executeHierarchicalAgentFlow(
      instance.id,
      message.body,
      message.from
    );
    console.log(`[${clientId}] Fluxo concluído. Resposta final: "${finalResponse}", ID da execução: ${executionId}`);

    console.log(`[${clientId}] Salvando mensagem recebida (INCOMING)...`);
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: message.id.id,
        direction: 'INCOMING',
        content: message.body,
        status: 'read',
        isRead: true,
        agentExecutionId: executionId,
      },
    });
    console.log(`[${clientId}] Mensagem INCOMING salva.`);

    console.log(`[${clientId}] Enviando resposta para ${message.from}...`);
    const sentMessage = await client.sendMessage(message.from, finalResponse);
    console.log(`[${clientId}] Resposta enviada com sucesso.`);

    console.log(`[${clientId}] Salvando mensagem enviada (OUTGOING)...`);
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: sentMessage.id.id,
        direction: 'OUTGOING',
        content: finalResponse,
        status: 'sent',
        agentExecutionId: executionId,
      },
    });
    console.log(`[${clientId}] Mensagem OUTGOING salva.`);

  } catch (error) {
    console.error(`[${clientId}] Erro fatal no processamento da mensagem:`, error);
    client.sendMessage(message.from, 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
  }
}""

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

export {
  startInstance,
  activeClients,
  disconnectInstance,
};
