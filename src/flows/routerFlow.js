import { defineFlow, generate } from '@genkit-ai/flow';
import * as z from 'zod';
import { geminiPro } from '@genkit-ai/googleai';

export const routerFlow = defineFlow(
  {
    name: 'routerFlow',
    inputSchema: z.object({
      message: z.string(),
      instanceId: z.string().describe('ID da instância do WhatsApp'),
      // A lista de agentes PARENT disponíveis para roteamento, com suas personas
      organizationAgents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        persona: z.string().optional(),
        config: z.any().optional(), // Inclui a config do agente pai
      })),
    }),
    outputSchema: z.object({
      selectedAgentId: z.string(),
      reason: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Você é um agente roteador que direciona mensagens de clientes para o departamento mais adequado.
    A mensagem do cliente é: "${input.message}".

    Os departamentos disponíveis são:
    ${input.organizationAgents.map(a => `- ${a.name} (ID: ${a.id}): ${a.persona || 'Nenhuma persona definida.'}`).join('\n')}

    Baseado na mensagem do cliente, qual departamento (agente PARENT) é o mais adequado para lidar com esta mensagem?
    Responda **apenas** com o ID do departamento selecionado e uma breve justificativa.
    Formato da resposta:
    ID: <ID_DO_DEPARTAMENTO>
    Justificativa: <SUA_JUSTIFICATIVA>`;

    const result = await generate({
      model: geminiPro,
      prompt: prompt,
      config: { temperature: 0.1 }, // Roteamento deve ser mais determinístico
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
