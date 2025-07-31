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

async function _handleIncomingWhatsAppMessage(client, message) {
  console.log(`✉️  Mensagem recebida para ${client.options.authStrategy.clientId}: ${message.body}`);

  if (message.isStatus || message.from.includes('@g.us')) return;

  const clientId = client.options.authStrategy.clientId;

  try {
    const instance = await prisma.instance.findUnique({ where: { clientId } });
    if (!instance) return;

    // Etapa de Auto-Correção: Garante que um Agente Roteador Principal exista
    let routerAgent = await prisma.agent.findFirst({
      where: {
        instanceId: instance.id,
        type: 'ROUTER',
        organizationId: null, // Chave para identificar o roteador principal
      },
    });

    if (!routerAgent) {
      console.warn(`⚠️ Nenhum Agente Roteador Principal encontrado para a instância ${instance.name}. Criando um automaticamente.`);
      const user = await prisma.user.findUnique({ where: { id: instance.userId } });
      if (user) {
        routerAgent = await agentHierarchyService.createParentAgent({
          name: `Roteador - ${instance.name}`,
          persona: 'Você é o agente roteador principal. Sua função é analisar a mensagem do usuário e direcioná-la para o departamento ou especialista correto (Vendas, Suporte, etc.). Se não tiver certeza, peça ao usuário para esclarecer.',
          instanceId: instance.id,
          organizationId: null,
          userId: user.id,
        });
        console.log(`✅ Agente Roteador Principal criado automaticamente para a instância ${instance.name}.`);
      } else {
        throw new Error(`Não foi possível criar o roteador principal pois o usuário da instância ${instance.id} não foi encontrado.`);
      }
    }

    // 1. Garante que o contato exista no banco de dados
    const wppContact = await message.getContact();
    const contact = await prisma.contact.upsert({
      where: { instanceId_phoneNumber: { instanceId: instance.id, phoneNumber: `+${message.from.split('@')[0]}`} },
      update: {
        name: wppContact.name,
        pushName: wppContact.pushname,
      },
      create: {
        instanceId: instance.id,
        // guardar o número de telefone no formato internacional message.from

        phoneNumber: `+${message.from.split('@')[0]}`, // Remove o sufixo do WhatsApp
        name: wppContact.name,
        pushName: wppContact.pushname ,
      },
    });

    // 2. Executa o fluxo de agentes para obter uma resposta e o ID da execução
    const { finalResponse, executionId } = await executeHierarchicalAgentFlow(
      instance.id,
      message.body,
      message.from
    );

    // 3. Salva a mensagem recebida (INCOMING) com o ID da execução
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: message.id.id,
        direction: 'INCOMING',
        content: message.body,
        status: 'read',
        isRead: true,
        agentExecutionId: executionId, // Vincula à execução
      },
    });

    // 4. Envia a resposta e a salva no banco de dados (OUTGOING)
    const sentMessage = await client.sendMessage(message.from, finalResponse);
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: sentMessage.id.id,
        direction: 'OUTGOING',
        content: finalResponse,
        status: 'sent',
        agentExecutionId: executionId, // Vincula à mesma execução
      },
    });

  } catch (error) {
    console.error('Erro ao processar mensagem do WhatsApp:', error);
    // Se o erro tiver um executionId, podemos usá-lo para registrar a falha
    const executionId = error.executionId || null;
    // Tenta salvar a mensagem de erro no banco de dados para rastreabilidade
    // (Opcional, mas bom para depuração)
    client.sendMessage(message.from, 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
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

  // Define o cliente ativo imediatamente para evitar corridas de condição
  activeClients[clientId] = client;

  // Define o status inicial com base no tipo de inicialização
  const initialStatus = isReconnection ? 'RECONNECTING' : 'PENDING_QR';
  const initialMessage = isReconnection ? `Reconectando instância ${clientId}...` : `Aguardando leitura do QR Code para a instância ${clientId}.`;
  updateInstanceStatus(clientId, initialStatus, initialMessage);

  client.on('qr', async (qr) => {
    // Se estamos em modo de reconexão, não devemos receber um QR code.
    // Se recebermos, significa que a sessão é inválida.
    if (isReconnection) {
      console.warn(`⚠️ Sessão para ${clientId} é inválida. Requer novo QR Code. Desconectando...`);
      await client.destroy(); // Usa destroy para limpar tudo
      // O evento 'disconnected' cuidará da atualização do status para DISCONNECTED
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
    delete activeClients[clientId];
    updateInstanceStatus(clientId, 'DISCONNECTED', `Instância ${clientId} foi desconectada.`);
  });

  client.on('remote_session_saved', () => {
    console.log(`💾 Sessão do ${clientId} salva no MongoDB`);
  });

  client.initialize().catch(error => {
      console.error(`❌ Falha ao inicializar a instância ${clientId}:`, error);
      // Garante que o cliente seja removido e o status atualizado em caso de falha na inicialização
      delete activeClients[clientId];
      updateInstanceStatus(clientId, 'DISCONNECTED', `Falha ao inicializar a instância ${clientId}.`);
  });

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
