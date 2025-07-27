Com certeza\! Para ilustrar como o Genkit se encaixa, vamos ver um exemplo de código funcional que integra o backend Node.js (com Express e Prisma) e os fluxos Genkit.

-----

### Exemplo de Código: Agente de Suporte e Agente de Vendas

Neste exemplo, teremos:

  * Uma **Ferramenta (Tool)** para "consultar\_estoque".
  * Um **Agente Roteador** que direciona a mensagem para "Suporte" ou "Vendas".
  * Um **Agente Pai de Vendas** (Departamento de Vendas).
  * Um **Agente Filho de Produto** (Especialista em Celulares).
  * Um **Agente Pai de Suporte** (Departamento de Suporte).
  * Um **Agente Filho de Problema Técnico** (Especialista em Problemas de Conexão).

O fluxo será:

1.  Usuário envia uma mensagem para o webhook.
2.  O sistema usa o **Agente Roteador** para decidir se é uma questão de **Vendas** ou **Suporte**.
3.  Se for **Vendas**, a mensagem é direcionada ao **Agente Pai de Vendas**.
4.  Se for **Suporte**, a mensagem é direcionada ao **Agente Pai de Suporte**.
5.  Em cada departamento, um agente filho (ou o próprio pai, para simplificar) é acionado para responder. No caso de Vendas, o **Especialista em Celulares** pode usar a ferramenta `consultar_estoque`.

-----

### Setup do Projeto

Primeiro, certifique-se de ter o projeto configurado conforme as instruções anteriores (estrutura de pastas, `package.json`, `.env` e `prisma/schema.prisma` ajustado para não ter templates).

**1. Ajuste seu `.env`:**

```env
DATABASE_URL="mongodb+srv://<seu_usuario>:<sua_senha>@<seu_cluster>.mongodb.net/<seu_database>?retryWrites=true&w=majority"
GOOGLE_API_KEY="SUA_CHAVE_API_DO_GOOGLE_AI_AQUI" # Essencial para o Genkit
```

**Importante:** Substitua `<seu_usuario>`, `<sua_senha>`, `<seu_cluster>`, `<seu_database>` e `SUA_CHAVE_API_DO_GOOGLE_AI_AQUI` pelos seus dados reais.

**2. Geração do Prisma Client e Migração:**

```bash
npx prisma generate
npx prisma migrate dev --name initial_setup
```

-----

### Código Atualizado

Aqui estão os arquivos-chave com os ajustes e exemplos:

#### `src/flows/routerFlow.js` (Inalterado, mas crucial)

```javascript
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
```

#### `src/flows/childFlow.js` (Com Suporte a Ferramentas Genéricas)

```javascript
import { defineFlow, generate, defineTool } from '@genkit-ai/flow';
import * as z from 'zod';
import { geminiPro } from '@genkit-ai/googleai';

// --- Exemplo de Implementação de Ferramenta Genkit ---
// Em um cenário real, você teria um mapa ou registro de funções de ferramenta.
// Por simplicidade, vamos simular uma ferramenta de consulta de estoque aqui.

// Define a ferramenta Genkit que o LLM pode "chamar"
const simulateStockCheckTool = defineTool(
  {
    name: 'consultar_estoque',
    description: 'Verifica a disponibilidade de um produto específico em nosso estoque. Retorna a quantidade disponível.',
    inputSchema: z.object({
      productName: z.string().describe('O nome do produto a ser verificado no estoque.'),
    }),
    outputSchema: z.object({
      productName: z.string(),
      quantity: z.number(),
      message: z.string(),
    }),
  },
  async (input) => {
    console.log(`[Tool] Simulando consulta de estoque para: ${input.productName}`);
    // Simulação de banco de dados ou API externa
    const stockData = {
      "iPhone 15": 10,
      "Samsung Galaxy S24": 5,
      "Fone de ouvido XPTO": 0,
    };
    const quantity = stockData[input.productName] !== undefined ? stockData[input.productName] : -1; // -1 para não encontrado

    if (quantity >= 0) {
      return {
        productName: input.productName,
        quantity: quantity,
        message: `Temos ${quantity} unidades de ${input.productName} em estoque.`,
      };
    } else {
      return {
        productName: input.productName,
        quantity: 0, // Considera 0 se não encontrar
        message: `Não encontramos informações de estoque para ${input.productName}.`,
      };
    }
  }
);


export const childFlow = defineFlow(
  {
    name: 'childFlow',
    inputSchema: z.object({
      message: z.string(),
      agentPersona: z.string(),
      agentConfig: z.object({
        maxTokens: z.number().optional().nullable(),
        temperature: z.number().optional().nullable(),
        model: z.string().optional().nullable(),
        systemPrompt: z.string().optional().nullable(),
        fallbackMessage: z.string().optional().nullable(),
        timeoutSeconds: z.number().optional().nullable(),
        maxRetries: z.number().optional().nullable(),
      }).nullable(),
      // Tools disponíveis para este agente, conforme configurado no DB
      toolsAvailable: z.array(z.object({
        name: z.string(),
        description: z.string(),
        config: z.any().optional().nullable(),
      })),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const finalPersona = input.agentPersona || "Você é um assistente útil e amigável.";
    const modelToUse = input.agentConfig?.model || "googleai/gemini-pro";
    const temperature = input.agentConfig?.temperature ?? 0.7;
    const maxTokens = input.agentConfig?.maxTokens ?? 1000;
    const systemPrompt = input.agentConfig?.systemPrompt || '';

    const promptContent = `${systemPrompt}\n\nVocê é um agente de IA com a seguinte persona: "${finalPersona}".
    Responda à mensagem do cliente de forma útil e apropriada.`;

    // Registra as ferramentas dinamicamente para o LLM.
    // Você precisaria de um mapa para mapear o 'name' da ferramenta do DB para a função Genkit real.
    const genkitToolFunctions = [];
    for (const tool of input.toolsAvailable) {
      if (tool.name === 'consultar_estoque') {
        genkitToolFunctions.push(simulateStockCheckTool);
      }
      // Adicione mais `if` ou um `switch` para outras ferramentas
      // else if (tool.name === 'outra_ferramenta') { genkitToolFunctions.push(outraGenkitTool); }
    }


    try {
      const result = await generate({
        model: modelToUse,
        prompt: promptContent,
        config: {
          temperature: temperature,
          maxTokens: maxTokens,
        },
        tools: genkitToolFunctions, // Passa as funções das ferramentas para o modelo LLM
      });

      // Se o LLM sugeriu uma ferramenta, o Genkit irá executá-la e o resultado estará no `result`.
      // O `.text()` irá retornar a resposta final, incluindo o que foi gerado após o tool calling.
      return result.text();
    } catch (error) {
      console.error("Erro ao gerar resposta do agente filho:", error);
      return input.agentConfig?.fallbackMessage || "Desculpe, não consigo ajudar com isso agora. Por favor, tente novamente mais tarde.";
    }
  }
);
```

**Observações:**

  * A função `simulateStockCheckTool` é um exemplo de como uma **Ferramenta Genkit** é definida usando `defineTool`. Ela encapsula a lógica que o LLM pode invocar.
  * Dentro do `childFlow`, o código itera sobre `input.toolsAvailable` (que vem do DB) e emparelha os nomes das ferramentas com suas implementações Genkit reais (aqui, `simulateStockCheckTool`). Em um sistema maior, você teria um registro mais robusto de implementações de ferramentas.

#### `src/services/agentService.js` (CRUD de Agentes e Ferramentas)

(Este arquivo já foi detalhado na resposta anterior para ter o CRUD de `Tool` e `AgentTool`, sem `Template`. Mantenha-o como está.)

#### `src/routes/agentRoutes.js` (Rotas para CRUD de Agentes e Ferramentas)

(Este arquivo já foi detalhado na resposta anterior para ter as rotas de `Tool` e `AgentTool`, sem `Template`. Mantenha-o como está.)

#### `src/routes/messageRoutes.js` (Webhook do WhatsApp, Orquestração)

(Este arquivo já foi detalhado na resposta anterior. Ele coordena a busca no DB, a chamada aos fluxos Genkit e o envio da resposta. Mantenha-o como está.)

#### `src/config/genkitConfig.js` (Configuração Genkit)

```javascript
import { configureGenkit } from '@genkit-ai/core';
import { geminiPro } from '@genkit-ai/googleai';

// Importe seus fluxos aqui para que o Genkit os registre
// Não precisamos importar as ferramentas aqui, elas são passadas dinamicamente para os fluxos
import './../flows/routerFlow.js';
import './../flows/childFlow.js';

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
```

-----

### Exemplo de Uso (Passos Manuais para Teste)

Para testar isso, você precisará simular as ações de um usuário criando agentes e ferramentas.

**1. Inicie seu servidor:**

```bash
npm run dev
```

**2. Crie uma Ferramenta (Tool) via API:**

  * **POST** `http://localhost:3000/api/tools`
  * **Body (JSON):**
    ```json
    {
      "name": "consultar_estoque",
      "description": "Verifica a disponibilidade de produtos no estoque.",
      "type": "ACTION",
      "config": { "endpoint": "internal_stock_system" },
      "isSystem": false
    }
    ```
    Guarde o `_id` da ferramenta criada. Ex: `TOOL_ID_CONSULTAR_ESTOQUE`

**3. Crie um Usuário e uma Instância (se ainda não fez, diretamente no DB ou via outra rota de API):**

  * **User ID:** `USER_ID_EXAMPLE`
  * **Instance ID:** `INSTANCE_ID_EXAMPLE`

**4. Crie os Agentes via API:**

  * **a) Agente Roteador:**

      * **POST** `http://localhost:3000/api/agents`
      * **Body (JSON):**
        ```json
        {
          "name": "Roteador Central",
          "type": "ROUTER",
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "persona": "Eu sou o ponto de contato inicial e direciono você ao departamento certo."
        }
        ```
      * Guarde o `_id` retornado: `ROUTER_AGENT_ID`

  * **b) Agente Pai: Departamento de Vendas**

      * **POST** `http://localhost:3000/api/agents`
      * **Body (JSON):**
        ```json
        {
          "name": "Departamento de Vendas",
          "type": "PARENT",
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "routerAgentId": "ROUTER_AGENT_ID",
          "persona": "Sou do departamento de vendas, pronto para ajudar com suas compras e informações de produtos.",
          "config": {
            "model": "googleai/gemini-pro",
            "temperature": 0.6
          }
        }
        ```
      * Guarde o `_id` retornado: `SALES_PARENT_AGENT_ID`

  * **c) Agente Filho: Especialista em Celulares (Vendas)**

      * **POST** `http://localhost:3000/api/agents`
      * **Body (JSON):**
        ```json
        {
          "name": "Especialista em Celulares",
          "type": "CHILD",
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "parentAgentId": "SALES_PARENT_AGENT_ID",
          "persona": "Sou especialista em celulares, posso te dar informações detalhadas, preços e verificar estoque de qualquer aparelho.",
          "config": {
            "model": "googleai/gemini-pro",
            "temperature": 0.7,
            "systemPrompt": "Você é um chatbot especializado em vendas de celulares. Seja prestativo, informativo e tente fechar a venda.",
            "fallbackMessage": "Não consegui verificar a informação sobre celulares. Posso ajudar com outra coisa?"
          },
          "toolIds": ["TOOL_ID_CONSULTAR_ESTOQUE"] // Associando a ferramenta criada
        }
        ```
      * Guarde o `_id` retornado: `CELL_PHONE_CHILD_AGENT_ID`

  * **d) Agente Pai: Departamento de Suporte**

      * **POST** `http://localhost:3000/api/agents`
      * **Body (JSON):**
        ```json
        {
          "name": "Departamento de Suporte",
          "type": "PARENT",
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "routerAgentId": "ROUTER_AGENT_ID",
          "persona": "Sou do departamento de suporte técnico, aqui para resolver seus problemas e dúvidas técnicas.",
          "config": {
            "model": "googleai/gemini-pro",
            "temperature": 0.5
          }
        }
        ```
      * Guarde o `_id` retornado: `SUPPORT_PARENT_AGENT_ID`

  * **e) Agente Filho: Especialista em Conexão (Suporte)**

      * **POST** `http://localhost:3000/api/agents`
      * **Body (JSON):**
        ```json
        {
          "name": "Especialista em Conexão",
          "type": "CHILD",
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "parentAgentId": "SUPPORT_PARENT_AGENT_ID",
          "persona": "Eu resolvo problemas de internet, Wi-Fi e conexão de dispositivos.",
          "config": {
            "model": "googleai/gemini-pro",
            "temperature": 0.7,
            "systemPrompt": "Você é um chatbot focado em solucionar problemas de conexão à internet e dispositivos.",
            "fallbackMessage": "Não consigo resolver esse problema de conexão. Por favor, reinicie seu roteador e tente novamente."
          }
        }
        ```

**5. Teste o Webhook do WhatsApp (simulando uma mensagem do cliente):**

  * **a) Mensagem para o departamento de Vendas:**

      * **POST** `http://localhost:3000/webhook/whatsapp`
      * **Body (JSON):**
        ```json
        {
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "from": "5511999998888",
          "message": "Quero saber sobre os novos iPhones, tem em estoque?",
          "wppId": "whatsapp_msg_vendas_1"
        }
        ```
      * **Resultado Esperado:** O roteador deve direcionar para o "Departamento de Vendas", e o "Especialista em Celulares" deve acionar a ferramenta `consultar_estoque` e responder com a disponibilidade. Você verá logs da ferramenta sendo chamada no console.

  * **b) Mensagem para o departamento de Suporte:**

      * **POST** `http://localhost:3000/webhook/whatsapp`
      * **Body (JSON):**
        ```json
        {
          "instanceId": "INSTANCE_ID_EXAMPLE",
          "from": "5511999997777",
          "message": "Minha internet não está funcionando, o que eu faço?",
          "wppId": "whatsapp_msg_suporte_1"
        }
        ```
      * **Resultado Esperado:** O roteador deve direcionar para o "Departamento de Suporte", e o "Especialista em Conexão" deve responder com uma dica de suporte.

-----

Este exemplo mostra como as ferramentas e agentes são criados no seu DB, e como o Genkit é usado dinamicamente para aplicar suas personas, configurações e capacidades de ferramenta com base nas definições do usuário. Isso oferece a flexibilidade que você procura para um sistema de autoatendimento poderoso\!