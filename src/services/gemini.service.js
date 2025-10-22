 // src/services/gemini.service.js
import { GoogleGenAI } from "@google/genai";

/**
 * Serviço Gemini centralizado
 * - Suporta streaming e modo não-stream
 * - Permite ajustar temperatura e persona dinamicamente
 * - Ideal para WhatsApp ou outros agentes
 */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
  const model = "gemini-flash-latest";

  const config = {
    temperature,
    thinkingConfig: { thinkingBudget: -1 },
    systemInstruction: [{ text: system }],
  };

  const contents = [
    {
      role: "user",
      parts: [{ text: user }],
    },
  ];

  try {
    if (stream) {
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });

      let fullText = "";
      for await (const chunk of response) {
        if (chunk.text) fullText += chunk.text;
      }
      return { text: fullText.trim() };
    } else {
      const response = await ai.models.generateContent({
        model,
        config,
        contents,
      });
      return { text: response.outputText.trim() };
    }
  } catch (err) {
    console.error("❌ Erro no Gemini:", err.message);
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

