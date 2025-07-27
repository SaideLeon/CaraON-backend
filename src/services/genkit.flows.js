const { defineFlow } = require('@genkit-ai/flow');
const { z } = require('zod');

/**
 * @description Exemplo de um flow simples que pode ser chamado por uma ferramenta.
 * Este flow recebe um nome e retorna uma saudação personalizada.
 */
const welcomeFlow = defineFlow(
  {
    name: 'welcomeFlow',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Bem-vindo, ${input.name}! Este é um flow Genkit executado dinamicamente.`;
  }
);


/**
 * @description Mapeamento de todos os flows disponíveis para execução dinâmica.
 * A chave deve ser o mesmo 'name' definido no flow.
 */
const availableFlows = {
  welcomeFlow,
  // Adicione outros flows exportados aqui para que fiquem disponíveis para as ferramentas.
};

module.exports = {
  availableFlows,
};
