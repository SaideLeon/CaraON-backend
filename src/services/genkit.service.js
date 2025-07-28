import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

import { defineTools } from './tool-definitions.js';

// Inicializa e exporta a instância configurada do Genkit.
// Esta instância será usada em todo o aplicativo para definir fluxos, ferramentas e gerar conteúdo.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'gemini-pro', // Define um modelo padrão, pode ser substituído em chamadas específicas.
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
  try {
    const llmResponse = await ai.generate({
      prompt,
      config: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
        // Adicione outros parâmetros de configuração do Genkit aqui, se necessário
      },
    });
    return llmResponse.text();
  } catch (error) {
    console.error('Erro ao gerar resposta com Genkit:', error);
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
    const prompt = `Você é um agente roteador que direciona mensagens de clientes para o departamento mais adequado.\n    A mensagem do cliente é: "${input.message}"\n\n    Os departamentos disponíveis são:\n    ${input.organizationAgents.map(a => `- ${a.name} (ID: ${a.id}): ${a.persona || 'Nenhuma persona definida.'}`).join('\n')}\n\n    Baseado na mensagem do cliente, qual departamento (agente PARENT) é o mais adequado para lidar com esta mensagem?\n    Responda **apenas** com o ID do departamento selecionado e uma breve justificativa.\n    Formato da resposta:\n    ID: <ID_DO_DEPARTAMENTO>\n    Justificativa: <SUA_JUSTIFICATIVA>`;

    const result = await ai.generate({
      prompt: prompt,
      model: 'gemini-pro', // Pode especificar o modelo aqui se for diferente do padrão
      config: { temperature: 0.1 },
    });

    const responseText = result.text();
    const idMatch = responseText.match(/ID:\s*(\S+)/i);
    const reasonMatch = responseText.match(/Justificativa:\s*(.*)/i);

    const selectedId = idMatch ? idMatch[1].trim() : null;
    const reason = reasonMatch ? reasonMatch[1].trim() : 'Nenhuma justificativa fornecida.';

    const selectedAgent = input.organizationAgents.find(a => a.id === selectedId);

    if (!selectedAgent) {
      console.warn(`RouterFlow: Nenhum agente selecionado ou ID inválido. Fallback para o primeiro agente disponível. Resposta LLM: ${responseText}`);
      return {
        selectedAgentId: input.organizationAgents[0]?.id || '',
        reason: `Não foi possível determinar o departamento. Roteado para o departamento padrão: ${input.organizationAgents[0]?.name || 'N/A'}.`
      };
    }

    return {
      selectedAgentId: selectedAgent.id,
      reason: reason,
    };
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
    const finalPersona = input.agentPersona || "Você é um assistente útil e amigável.";
    const modelToUse = input.agentConfig?.model || "gemini-pro"; // O modelo padrão é definido na instância ai
    const temperature = input.agentConfig?.temperature ?? 0.7;
    const maxTokens = input.agentConfig?.maxTokens ?? 1500;
    const systemPrompt = input.agentConfig?.systemPrompt || '';

    const promptContent = `${systemPrompt}\n\nPersona: "${finalPersona}".\nResponda à mensagem do cliente: "${input.message}"`;

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

        return result.text();
    } catch (error) {
        console.error("Erro ao gerar resposta do agente filho:", error);
        return input.agentConfig?.fallbackMessage || "Desculpe, não consigo ajudar com isso agora. Por favor, tente novamente mais tarde.";
    }
});

export {
  searchProductsTool,
  toolRegistry,
  generateResponse,
};