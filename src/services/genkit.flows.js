const { defineFlow } = require('@genkit-ai/flow');
const { z } = require('zod');

/**
 * @description Mapeamento de todos os flows disponíveis para execução dinâmica.
 * A chave deve ser o mesmo 'name' definido no flow.
 */
const availableFlows = {
  // Adicione outros flows exportados aqui para que fiquem disponíveis para as ferramentas.
};

module.exports = {
  availableFlows,
};
