import { GoogleGenAI } from '@google/genai'

/**
 * Serviço Gemini — responsável por gerar respostas contextuais e humanas.
 * Usa o modelo gemini-flash-latest para manter agilidade nas respostas.
 */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Configuração base do agente
const baseConfig = {
  thinkingConfig: { thinkingBudget: -1 },
  systemInstruction: [
    {
      text: `
      Você é "Assistente Saíde", um agente de WhatsApp que conversa como um humano:
      - Fale de modo natural, curto e educado.
      - Faça perguntas diretas se algo não estiver claro.
      - Quando o contexto for irrelevante ou confuso, reformule a pergunta ou peça mais detalhes.
      - Evite soar robótico ou genérico.
      `,
    },
  ],
}

/**
 * Gera uma resposta do modelo Gemini baseada em uma mensagem do usuário
 * e um contexto opcional.
 *
 * @param {string} input - Mensagem atual do usuário.
 * @param {string[]} [context=[]] - Histórico ou contexto da conversa.
 * @returns {Promise<string>} - Resposta do agente.
 */
export async function generateGeminiReply(input, context = []) {
  try {
    // Cria o conteúdo enviado ao modelo (usuário + contexto)
    const messages = [
      ...context.map((ctx) => ({
        role: 'user',
        parts: [{ text: ctx }],
      })),
      {
        role: 'user',
        parts: [{ text: input }],
      },
    ]

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      config: baseConfig,
      contents: messages,
    })

    // Extrai texto principal da resposta
    const text = response.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) {
      return 'Desculpe, não consegui entender bem. Pode reformular?'
    }

    return text
  } catch (err) {
    console.error('❌ Erro ao gerar resposta Gemini:', err)
    return 'Ops, ocorreu um erro momentâneo. Pode repetir sua mensagem?'
  }
}
