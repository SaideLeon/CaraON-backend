 // src/services/gemini.service.js
import { GoogleGenerativeAI } from "@google/generative-ai"; // Importação corrigida para o nome do pacote mais recente

/**
 * Serviço Gemini centralizado
 * - Suporta streaming e modo não-stream
 * - Permite ajustar temperatura e persona dinamicamente
 * - Ideal para WhatsApp ou outros agentes
 */

// A classe foi renomeada no pacote para GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Chama o modelo Gemini com ou sem streaming
 * @param {Object} options
 * @param {string} options.system - Instruções do sistema/persona
 * @param {string} options.user - Prompt do usuário
 * @param {number} [options.temperature=0.4] - Controle de criatividade
 * @param {boolean} [options.stream=false] - Ativa/desativa streaming
 * @returns {Promise<{ text: string }>} resposta textual
 */
export async function callGemini({
  system,
  user,
  temperature = 0.4,
  stream = false,
}) {
  // Para modelos mais recentes, é recomendado usar 'gemini-1.5-flash'
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: system,
    generationConfig: { temperature },
  });

  const chat = model.startChat();

  try {
    if (stream) {
      const result = await chat.sendMessageStream(user);

      let fullText = "";
      for await (const chunk of result.stream) {
        // Acessa o texto usando a função text() do chunk
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
        }
      }
      return { text: fullText.trim() };
    } else {
      const result = await chat.sendMessage(user);
      const response = result.response;
      // Caminho correto para acessar o texto da resposta
      const text = response.candidates[0].content.parts[0].text;
      return { text: text.trim() };
    }
  } catch (err) {
    console.error("❌ Erro no Gemini:", err.message);
    // Adiciona um log do erro completo para melhor depuração
    console.error(err);
    return {
      text: "Desculpa, estou com dificuldade em processar isso agora. Pode repetir de outro jeito?",
    };
  }
}

/**
 * Gera embedding de texto para busca vetorial/contexto
 * Pode usar este método para salvar no MongoDB.
 */

/**
 * Persona padrão do Assistente Saíde
 */
export const defaultPersona = `
Você é "Assistente Saíde", um agente de WhatsApp empático e natural.
Responda como um humano educado e breve.
Evite linguagem técnica e seja conversacional.
Se o contexto for insuficiente, peça clarificação em uma frase curta.
Pode usar emojis sutis (😊, 😉, 👍) se adequado.
`;