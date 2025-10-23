// src/services/whatsapp.service.js

import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import qrcode from 'qrcode';
import * as webSocketService from './websocket.service.js';
import * as ariacService from './ariac.service.js';
import { callGemini, defaultPersona } from "./gemini.service.js";
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

// 🧠 Função com memória conversacional
async function responderMensagem(incomingText, contextSummary, instanceId, contactId) {
  const systemPrompt = defaultPersona;

  // 🔹 Recupera últimas 5 mensagens (ordenadas por ID, já que createdAt não existe)
  const recentMessages = await prisma.message.findMany({
    where: { instanceId, contactId },
    orderBy: { id: 'desc' },
    take: 5,
  });

  const chatHistory = recentMessages
    .reverse()
    .map(msg => (msg.direction === 'INCOMING'
      ? `Usuário: ${msg.content}`
      : `Assistente: ${msg.content}`))
    .join('\n');

  // 🔹 Recupera última memória (ordenada por ID também)
  const lastMemory = await prisma.memory.findFirst({
    where: { instanceId, contactId },
    orderBy: { id: 'desc' },
  });

  const memoryContext = lastMemory ? lastMemory.summary : "Sem memória registrada.";

  // 🔹 Prompt unificado
  const userPrompt = `
Você é um assistente do sistema Ariac.

Memória acumulada do diálogo:
${memoryContext}

Últimas mensagens trocadas:
${chatHistory || "Nenhuma conversa recente."}

Contexto adicional:
${contextSummary || "Sem contexto adicional."}

Mensagem atual do usuário:
"${incomingText}"

Responda de forma natural, breve e útil, mantendo coerência com a conversa e a memória.
`;

  // 🔹 Chamada ao modelo Gemini
  const resposta = await callGemini({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.4,
    stream: false,
  });

  const respostaTexto = resposta.text?.trim() || "Desculpe, não consegui gerar uma resposta no momento.";
  console.log("🤖 Resposta Gemini:", respostaTexto);

  // 🔹 Atualiza memória contextual
  const memoryUpdatePrompt = `
Resuma o que o assistente aprendeu sobre o usuário e o contexto com base nesta conversa.
Histórico:
${chatHistory}

Mensagem atual: ${incomingText}
Resposta do assistente: ${respostaTexto}
Crie um resumo curto e útil, evitando repetições.
`;

  const memoryUpdate = await callGemini({
    system: "Você é um sintetizador de memória conversacional. Produza um resumo consistente e objetivo.",
    user: memoryUpdatePrompt,
    temperature: 0.3,
    stream: false,
  });

  const newSummary = memoryUpdate.text?.trim();
  if (newSummary && newSummary.length > 10) {
    await prisma.memory.create({
      data: {
        instanceId,
        contactId,
        content: messageText || 'Sem conteúdo detectado',
        summary
      }
    })
    console.log("🧠 Memória atualizada com novo resumo contextual.");
  }

  return respostaTexto;
}

async function _handleIncomingWhatsAppMessage(client, message) {
  console.log(`✉️ Mensagem recebida para ${client.options.authStrategy.clientId}: ${message.body}`);

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
      where: {
        instanceId_phoneNumber: {
          instanceId: instance.id,
          phoneNumber: `+${message.from.split('@')[0]}`,
        },
      },
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

    // 💾 Salva mensagem recebida
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

    // 🔹 Chama o agente Ariac
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

    const middleResponse = agentResponse.response;

    // 🔹 Chama o Gemini com memória
    const finalResponse = await responderMensagem(
      message.body,
      middleResponse,
      instance.id,
      contact.id
    );

    // 💬 Envia e salva resposta
    const sentMessage = await client.sendMessage(message.from, finalResponse);
    await prisma.message.create({
      data: {
        instanceId: instance.id,
        contactId: contact.id,
        wppId: sentMessage.id.id,
        direction: 'OUTGOING',
        content: finalResponse,
        status: 'sent',
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
  const initialMessage = isReconnection
    ? `Reconectando instância ${clientId}...`
    : `Aguardando leitura do QR Code para a instância ${clientId}.`;
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
