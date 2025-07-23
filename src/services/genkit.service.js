const { geminiPro } = require('@genkit-ai/vertexai');

/**
 * Gera uma resposta usando o modelo Genkit (Gemini Pro).
 * @param {string} prompt - O prompt para o modelo.
 * @param {object} [config] - Configurações opcionais para a geração (maxTokens, temperature, etc.).
 * @returns {Promise<string>} A resposta de texto gerada pelo modelo.
 */
async function generateResponse(prompt, config = {}) {
  try {
    const llmResponse = await geminiPro.generate({
      prompt,
      config: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
        // Adicione outros parâmetros de configuração do Genkit aqui, se necessário
      },
    });
    return llmResponse.text();
  } catch (error) {
    console.error('Erro ao gerar resposta com Genkit:', error);
    throw new Error('Falha ao se comunicar com o modelo de linguagem.');
  }
}

module.exports = {
  generateResponse,
};