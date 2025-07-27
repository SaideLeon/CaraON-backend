import { configureGenkit } from '@genkit-ai/core';
import { geminiPro } from '@genkit-ai/googleai';

// Importe seus fluxos aqui para que o Genkit os registre
// Não precisamos importar as ferramentas aqui, elas são passadas dinamicamente para os fluxos
import './src/flows/routerFlow.js';
import './src/flows/childFlow.js';

export const setupGenkit = () => {
  configureGenkit({
    plugins: [
      // Importante: Genkit usa as variáveis de ambiente como GOOGLE_API_KEY automaticamente
      geminiPro(),
    ],
    logLevel: 'debug',
  });
  console.log('Genkit configurado.');
};
