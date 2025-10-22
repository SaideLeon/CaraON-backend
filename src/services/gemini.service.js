// src/services/gemini.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function callGemini({
  system,
  user,
  temperature = 0.4,
  stream = false,
}) {
  // CORREÇÃO: Altere o nome do modelo para 'gemini-pro'.
  // O modelo 'gemini-1.5-flash' pode não estar disponível para a sua API key ou região.
  // 'gemini-pro' é um modelo estável e recomendado para a maioria dos casos de uso.
  const model = genAI.getGenerativeModel({
    model: "gemini-pro", // <<-- Mude aqui
    systemInstruction: system,
    generationConfig: { temperature },
  });

  // O restante do seu código está correto e não precisa de alterações.
  const chat = model.startChat();

  try {
    if (stream) {
      const result = await chat.sendMessageStream(user);
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
        }
      }
      return { text: fullText.trim() };
    } else {
      const result = await chat.sendMessage(user);
      const response = result.response;
      console.log("🤖 Resposta do Gemini:", response);
      const text = response.candidates[0].content.parts[0].text;
      return { text: text.trim() };
    }
  } catch (err) {
    console.error("❌ Erro no Gemini:", err.message);
    console.error(err);
    return {
      text: "Desculpa, estou com dificuldade em processar isso agora. Pode repetir de outro jeito?",
    };
  }
}

// O restante do arquivo permanece o mesmo...
export const defaultPersona = `
Você é "Assistente Saíde", um agente de WhatsApp empático e natural.
Responda como um humano educado e breve.
Evite linguagem técnica e seja conversacional.
Se o contexto for insuficiente, peça clarificação em uma frase curta.
Pode usar emojis sutis (😊, 😉, 👍) se adequado.
`;