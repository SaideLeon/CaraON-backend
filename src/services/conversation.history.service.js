// Simulação em memória para o histórico de conversas.
// Substitua por uma implementação Redis quando estiver pronto.

const conversationHistories = {}; // Armazena os históricos em memória

const MAX_HISTORY_LENGTH = 20; // Manter as últimas 20 mensagens (10 trocas)

/**
 * Adiciona uma mensagem ao histórico de uma conversa.
 * @param {string} conversationId - ID único da conversa (ex: número de telefone).
 * @param {'user' | 'agent'} author - Quem enviou a mensagem.
 * @param {string} content - O conteúdo da mensagem.
 */
function addMessageToHistory(conversationId, author, content) {
  if (!conversationHistories[conversationId]) {
    conversationHistories[conversationId] = [];
  }

  const history = conversationHistories[conversationId];
  history.push({ author, content });

  // Garante que o histórico não cresça indefinidamente
  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift(); // Remove a mensagem mais antiga
  }
  console.log(`>> HistoryService: Mensagem de '${author}' adicionada à conversa ${conversationId}. Tamanho atual: ${history.length}`);
}

/**
 * Recupera o histórico formatado de uma conversa.
 * @param {string} conversationId - ID único da conversa.
 * @returns {string} O histórico formatado como uma string, pronto para ser usado no prompt.
 */
function getFormattedHistory(conversationId) {
  const history = conversationHistories[conversationId];
  if (!history || history.length === 0) {
    return ''; // Retorna string vazia se não houver histórico
  }

  const formatted = history
    .map(msg => `${msg.author === 'user' ? 'Usuário' : 'Agente'}: ${msg.content}`)
    .join('\n');
  
  console.log(`>> HistoryService: Histórico recuperado para a conversa ${conversationId}.`);
  return `\n--- Histórico da Conversa Anterior ---\n${formatted}\n------------------------------------\n`;
}

/**
 * Limpa o histórico de uma conversa específica.
 * @param {string} conversationId - ID único da conversa.
 */
function clearHistory(conversationId) {
  if (conversationHistories[conversationId]) {
    delete conversationHistories[conversationId];
    console.log(`>> HistoryService: Histórico da conversa ${conversationId} limpo.`);
  }
}

export {
  addMessageToHistory,
  getFormattedHistory,
  clearHistory,
};
