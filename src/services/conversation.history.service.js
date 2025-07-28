// Implementação com Redis para o histórico de conversas.
import { createClient } from 'redis';

// Cria e conecta o cliente Redis.
// Por padrão, ele tentará se conectar a redis://localhost:6379
const client = createClient();
client.on('error', (err) => console.error('>> Redis Client Error', err));
// A conexão é feita aqui para que o cliente esteja pronto para as funções.
// O await é feito no topo do módulo para garantir que a conexão esteja estabelecida.
await client.connect();

console.log('✅ Conectado ao servidor Redis para histórico de conversas.');

const MAX_HISTORY_LENGTH = 20; // Manter as últimas 20 mensagens (10 trocas)

/**
 * Adiciona uma mensagem ao histórico de uma conversa no Redis.
 * @param {string} conversationId - ID único da conversa (ex: número de telefone).
 * @param {'user' | 'agent'} author - Quem enviou a mensagem.
 * @param {string} content - O conteúdo da mensagem.
 */
async function addMessageToHistory(conversationId, author, content) {
  const message = JSON.stringify({ author, content });
  
  // LPUSH adiciona o novo item no início da lista.
  await client.lPush(conversationId, message);
  
  // LTRIM mantém a lista com no máximo MAX_HISTORY_LENGTH itens.
  await client.lTrim(conversationId, 0, MAX_HISTORY_LENGTH - 1);
  
  console.log(`>> HistoryService (Redis): Mensagem de '${author}' adicionada à conversa ${conversationId}.`);
}

/**
 * Recupera o histórico formatado de uma conversa do Redis.
 * @param {string} conversationId - ID único da conversa.
 * @returns {Promise<string>} O histórico formatado como uma string.
 */
async function getFormattedHistory(conversationId) {
  // LRANGE recupera os itens da lista. 0 a -1 significa "todos os itens".
  const history = await client.lRange(conversationId, 0, -1);

  if (!history || history.length === 0) {
    return '';
  }

  // As mensagens são armazenadas como strings JSON, então precisamos parseá-las.
  // O Redis retorna do mais recente para o mais antigo (por causa do LPUSH),
  // então revertemos para ter a ordem cronológica correta no prompt.
  const formatted = history
    .reverse() 
    .map(msgStr => JSON.parse(msgStr))
    .map(msg => `${msg.author === 'user' ? 'Usuário' : 'Agente'}: ${msg.content}`)
    .join('\n');
  
  console.log(`>> HistoryService (Redis): Histórico recuperado para a conversa ${conversationId}.`);
  return `\n--- Histórico da Conversa Anterior ---\n${formatted}\n------------------------------------\n`;
}

/**
 * Limpa o histórico de uma conversa específica no Redis.
 * @param {string} conversationId - ID único da conversa.
 */
async function clearHistory(conversationId) {
  await client.del(conversationId);
  console.log(`>> HistoryService (Redis): Histórico da conversa ${conversationId} limpo.`);
}

export {
  addMessageToHistory,
  getFormattedHistory,
  clearHistory,
};