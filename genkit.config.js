import { genkit } from 'genkit'; // Importa 'genkit' diretamente do pacote consolidado
import { googleAI } from '@genkit-ai/googleai'; // Importa o plugin 'googleAI'
import { logger } from 'genkit/logging'; // Importa o logger para configurar o nível de log

// Importe seus fluxos aqui para que o Genkit os registre
// Não precisamos importar as ferramentas aqui, elas são passadas dinamicamente para os fluxos
import './src/flows/routerFlow.js';
import './src/flows/childFlow.js';

export const setupGenkit = () => {
  // A configuração do Genkit agora é baseada em instância, usando a função genkit()
  const ai = genkit({
    plugins: [
      googleAI(), // O plugin googleAI é passado para o array de plugins
    ],
     model: 'googleai/gemini-2.0-flash', // Define o modelo a ser usado
    // O nível de log é configurado separadamente através do objeto logger
  });
  logger.setLogLevel('debug'); // Define o nível de log para 'debug'
  console.log('Genkit configurado.');
};