import { defineFlow, generate } from '@genkit-ai/flow';
import * as z from 'zod';
import { toolRegistry } from '../services/tool-definitions.js';

export const childFlow = defineFlow({
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
    const modelToUse = input.agentConfig?.model || "googleai/gemini-2.0-flash";
    const temperature = input.agentConfig?.temperature ?? 0.7;
    const maxTokens = input.agentConfig?.maxTokens ?? 1500;
    const systemPrompt = input.agentConfig?.systemPrompt || '';

    const promptContent = `${systemPrompt}\n\nPersona: "${finalPersona}".\nResponda à mensagem do cliente: "${input.message}"`;

    const genkitTools = input.toolsAvailable
        .map(toolName => toolRegistry[toolName])
        .filter(Boolean);

    try {
        const result = await generate({
            model: modelToUse,
            prompt: promptContent,
            config: {
                temperature: temperature,
                maxOutputTokens: maxTokens,
            },
            tools: genkitTools,
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