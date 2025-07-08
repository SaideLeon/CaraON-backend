const { defineFlow, runFlow } = require('@genkit-ai/flow');
const { geminiPro } = require('@genkit-ai/vertexai');
const { z } = require('zod');

// Fluxo de saudação simples
const greetingFlow = defineFlow(
  {
    name: 'greetingFlow',
    inputSchema: z.object({ message: z.string(), persona: z.string().optional() }),
    outputSchema: z.string(),
  },
  async (input) => {
    let prompt = input.message;
    if (input.persona) {
      prompt = `Você é um agente com a seguinte persona: "${input.persona}". Responda à seguinte mensagem: ${prompt}`;
    }
    const llmResponse = await geminiPro.generate({ prompt });
    return llmResponse.text();
  }
);

const flows = {
  greetingFlow,
};

module.exports = {
  flows,
};
