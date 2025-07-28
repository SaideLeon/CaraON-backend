import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

import { defineTools } from './tool-definitions.js';

// Inicializa e exporta a instância configurada do Genkit.
// Esta instância será usada em todo o aplicativo para definir fluxos, ferramentas e gerar conteúdo.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash', // Define um modelo padrão, pode ser substituído em chamadas específicas.
  logLevel: 'debug',
});

// Define as ferramentas após a configuração do 'ai' instance
const { searchProductsTool, toolRegistry } = defineTools(ai);

/**
 * Gera uma resposta usando o modelo Genkit (Gemini Pro).
 * @param {string} prompt - O prompt para o modelo.
 * @param {object} [config] - Configurações opcionais para a geração (maxTokens, temperature, etc.).
 * @returns {Promise<string>} A resposta de texto gerada pelo modelo.
 */
async function generateResponse(prompt, config = {}) {
  console.log(">> generateResponse: Iniciando a geração de resposta...");
  console.log(">> generateResponse: Prompt:", prompt);
  console.log(">> generateResponse: Config:", config);
  try {
    const llmResponse = await ai.generate({
      prompt,
      config: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
        // Adicione outros parâmetros de configuração do Genkit aqui, se necessário
      },
    });
    const responseText = llmResponse.text();
    console.log(">> generateResponse: Resposta gerada com sucesso:", responseText);
    return responseText;
  } catch (error) {
    console.error('>> generateResponse: Erro detalhado ao gerar resposta com Genkit:', error);
    throw new Error('Falha ao se comunicar com o modelo de linguagem.');
  }
}

export const routerFlow = ai.defineFlow(
  {
    name: 'routerFlow',
    inputSchema: z.object({
      message: z.string(),
      instanceId: z.string().describe('ID da instância do WhatsApp'),
      organizationAgents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        persona: z.string().optional(),
        config: z.any().optional(),
      })),
    }),
    outputSchema: z.object({
      selectedAgentId: z.string(),
      reason: z.string(),
    }),
  },
  async (input) => {
    console.log('>> routerFlow: Iniciando...', { input });
    const prompt = `Você é um agente roteador que direciona mensagens de clientes para o departamento mais adequado.\n    A mensagem do cliente é: "${input.message}"\n\n    Os departamentos disponíveis são:\n    ${input.organizationAgents.map(a => `- ${a.name} (ID: ${a.id}): ${a.persona || 'Nenhuma persona definida.'}`).join('\n')}\n\n    Baseado na mensagem do cliente, qual departamento (agente PARENT) é o mais adequado para lidar com esta mensagem?\n    Responda **apenas** com o ID do departamento selecionado e uma breve justificativa.\n    Formato da resposta:\n    ID: <ID_DO_DEPARTAMENTO>\n    Justificativa: <SUA_JUSTIFICATIVA>`;

    console.log('>> routerFlow: Prompt enviado para o modelo:', prompt);

    try {
      const result = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-2.0-flash', // Pode especificar o modelo aqui se for diferente do padrão
        config: { temperature: 0.1 },
      });

      const responseText = result.text();
      console.log('>> routerFlow: Resposta recebida do modelo:', responseText);

      const idMatch = responseText.match(/ID:\s*(\S+)/i);
      const reasonMatch = responseText.match(/Justificativa:\s*(.*)/i);

      const selectedId = idMatch ? idMatch[1].trim() : null;
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Nenhuma justificativa fornecida.';

      console.log('>> routerFlow: ID extraído:', selectedId);
      console.log('>> routerFlow: Justificativa extraída:', reason);

      const selectedAgent = input.organizationAgents.find(a => a.id === selectedId);

      if (!selectedAgent) {
        console.warn(`>> routerFlow: Nenhum agente correspondente encontrado para o ID: ${selectedId}. Fallback para o primeiro agente.`);
        const fallbackAgent = input.organizationAgents[0];
        if (!fallbackAgent) {
            console.error('>> routerFlow: Nenhum agente de fallback disponível.');
            throw new Error('Nenhum agente de fallback disponível.');
        }
        return {
          selectedAgentId: fallbackAgent.id,
          reason: `Não foi possível determinar o departamento. Roteado para o departamento padrão: ${fallbackAgent.name}.`
        };
      }

      console.log('>> routerFlow: Agente selecionado:', selectedAgent);
      return {
        selectedAgentId: selectedAgent.id,
        reason: reason,
      };
    } catch (error) {
        console.error('>> routerFlow: Erro durante a execução:', error);
        // Em caso de erro, faz fallback para o primeiro agente para não interromper o fluxo
        const fallbackAgent = input.organizationAgents[0];
        if (!fallbackAgent) {
            console.error('>> routerFlow: Erro e nenhum agente de fallback disponível.');
            throw new Error('Erro no routerFlow e nenhum agente de fallback disponível.');
        }
        return {
            selectedAgentId: fallbackAgent.id,
            reason: `Ocorreu um erro ao selecionar o departamento. Roteado para o padrão: ${fallbackAgent.name}.`
        };
    }
  }
);



export const childFlow = ai.defineFlow({
    name: 'childFlow',
    inputSchema: z.object({
        message: z.string(),
        userId: z.string().optional(),
        agentPersona: z.string(),
        agentConfig: z.object({
            maxTokens: z.number().optional().nullable(),
            temperature: z.number().optional().nullable(),
            model: z.string().optional().nullable(),
            systemPrompt: z.string().optional().nullable(),
            fallbackMessage: z.string().optional().nullable(),
        }).nullable(),
        toolsAvailable: z.array(z.string()),
    }),
    outputSchema: z.string(),
}, async (input) => {
    console.log('>> childFlow: Iniciando...', { input });

    const finalPersona = input.agentPersona || "Você é um assistente útil e amigável.";
    const modelToUse = "googleai/gemini-2.0-flash";
    const temperature = input.agentConfig?.temperature ?? 0.7;
    const maxTokens = input.agentConfig?.maxTokens ?? 1500;
    const systemPrompt = input.agentConfig?.systemPrompt || '';

    const promptContent = `${systemPrompt}\n\nPersona: "${finalPersona}".\nResponda à mensagem do cliente: "${input.message}"`;

    console.log('>> childFlow: Parâmetros para geração:', {
        modelToUse,
        temperature,
        maxTokens,
        finalPersona,
        systemPrompt,
        userId: input.userId,
    });
    console.log('>> childFlow: Prompt final enviado para o modelo:', promptContent);

    try {
        const result = await ai.generate({
            model: modelToUse,
            prompt: promptContent,
            config: {
                temperature: temperature,
                maxOutputTokens: maxTokens,
            },
            context: {
                userId: input.userId,
            },
        });

        const responseText = result.text();
        console.log('>> childFlow: Resposta recebida do modelo:', responseText);
        return responseText;
    } catch (error) {
        console.error(">> childFlow: Erro ao gerar resposta do agente filho:", error);
        const fallbackMessage = input.agentConfig?.fallbackMessage || "Desculpe, não consigo ajudar com isso agora. Por favor, tente novamente mais tarde.";
        console.log('>> childFlow: Retornando mensagem de fallback:', fallbackMessage);
        return fallbackMessage;
    }
});

export {
  searchProductsTool,
  toolRegistry,
  generateResponse,
};