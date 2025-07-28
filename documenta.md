Crie seu primeiro fluxo
Um fluxo é uma função especial do Genkit com observabilidade integrada, segurança de tipo e integração de ferramentas.

Atualização src/index.tscom o seguinte:

import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.8
  }),
});

// Define input schema
const RecipeInputSchema = z.object({
  ingredient: z.string().describe('Main ingredient or cuisine type'),
  dietaryRestrictions: z.string().optional().describe('Any dietary restrictions'),
});

// Define output schema
const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  tips: z.array(z.string()).optional(),
});

// Define a recipe generator flow
export const recipeGeneratorFlow = ai.defineFlow(
  {
    name: 'recipeGeneratorFlow',
    inputSchema: RecipeInputSchema,
    outputSchema: RecipeSchema,
  },
  async (input) => {
    // Create a prompt based on the input
    const prompt = `Create a recipe with the following requirements:
      Main ingredient: ${input.ingredient}
      Dietary restrictions: ${input.dietaryRestrictions || 'none'}`;

    // Generate structured recipe data using the same schema
    const { output } = await ai.generate({
      prompt,
      output: { schema: RecipeSchema },
    });

    if (!output) throw new Error('Failed to generate recipe');

    return output;
  }
);

// Run the flow
async function main() {
  const recipe = await recipeGeneratorFlow({
    ingredient: 'avocado',
    dietaryRestrictions: 'vegetarian'
  });

  console.log(recipe);
}

main().catch(console.error);

Este exemplo de código:

Define esquemas de entrada e saída reutilizáveis com Zod
Configura o gemini-2.5-flashmodelo com configurações de temperatura
Define um fluxo Genkit para gerar uma receita estruturada com base em sua entrada
Executa o fluxo com uma entrada de amostra e imprime o resultado
Por que usar fluxos?
Entradas e saídas com segurança de tipo
Integra-se com a interface do desenvolvedor
Fácil implantação como APIs
Rastreamento e observabilidade integrado

Chamada de ferramenta
Chamada de ferramentas , também conhecida como chamada de função , é uma maneira estruturada de permitir que os LLMs façam solicitações ao aplicativo que as chamou. Você define as ferramentas que deseja disponibilizar ao modelo, e o modelo fará solicitações de ferramentas ao seu aplicativo conforme necessário para atender às solicitações que você fornecer.

Os casos de uso de chamadas de ferramentas geralmente se enquadram em alguns temas:

Dar a um LLM acesso a informações com as quais não foi treinado

Informações que mudam com frequência, como o preço de uma ação ou o clima atual.
Informações específicas sobre o domínio do seu aplicativo, como informações do produto ou perfis de usuários.
Observe a sobreposição com a geração aumentada de recuperação (RAG), que também é uma maneira de permitir que um LLM integre informações factuais em suas gerações. A RAG é uma solução mais robusta, mais adequada quando se tem uma grande quantidade de informações ou quando as informações mais relevantes para um prompt são ambíguas. Por outro lado, se a recuperação das informações que o LLM precisa for uma simples chamada de função ou consulta a um banco de dados, a chamada de ferramenta é mais apropriada.

Introdução de um grau de determinismo em um fluxo de trabalho de LLM

Executar cálculos que o LLM não consegue concluir sozinho de forma confiável.
Forçar um LLM a gerar texto literal em determinadas circunstâncias, como ao responder a uma pergunta sobre os termos de serviço de um aplicativo.
Executar uma ação quando iniciada por um LLM

Ligar e desligar luzes em um assistente doméstico alimentado por LLM
Reserva de mesas em um agente de restaurante com LLM
Antes de começar
Se quiser executar os exemplos de código nesta página, primeiro siga as etapas do guia de introdução . Todos os exemplos pressupõem que você já tenha configurado um projeto com as dependências do Genkit instaladas.

Esta página aborda um dos recursos avançados da abstração de modelos do Genkit. Portanto, antes de se aprofundar, você deve se familiarizar com o conteúdo da página Gerando conteúdo com modelos de IA . Você também deve se familiarizar com o sistema do Genkit para definir esquemas de entrada e saída, discutido na página Fluxos .

Visão geral da chamada de ferramenta
Genkit por Exemplo: Chamada de Ferramentas
Veja como o Genkit pode habilitar uma interface de usuário rica para chamadas de ferramentas em uma demonstração ao vivo.
Em um nível mais alto, é assim que uma interação típica de chamada de ferramenta com um LLM se parece:

O aplicativo de chamada solicita ao LLM uma resposta e também inclui no prompt uma lista de ferramentas que o LLM pode usar para gerar uma resposta.
O LLM gera uma resposta completa ou gera uma solicitação de chamada de ferramenta em um formato específico.
Se o chamador receber uma resposta completa, a solicitação será atendida e a interação terminará; mas se o chamador receber uma chamada de ferramenta, ele executará qualquer lógica apropriada e enviará uma nova solicitação ao LLM contendo o prompt original ou alguma variação dele, bem como o resultado da chamada de ferramenta.
O LLM manipula o novo prompt como na Etapa 2.
Para que isso funcione, vários requisitos devem ser atendidos:

O modelo deve ser treinado para fazer solicitações de ferramentas quando necessário para concluir um prompt. A maioria dos modelos maiores fornecidos por APIs da web, como Gemini e Claude, consegue fazer isso, mas modelos menores e mais especializados geralmente não conseguem. O Genkit gerará um erro se você tentar fornecer ferramentas a um modelo que não as suporte.
O aplicativo de chamada deve fornecer definições de ferramentas ao modelo no formato esperado.
O aplicativo de chamada deve solicitar ao modelo que gere solicitações de chamada de ferramenta no formato esperado pelo aplicativo.
Chamada de ferramentas com Genkit
O Genkit fornece uma interface única para chamadas de ferramentas com modelos compatíveis. Cada plugin de modelo garante que os dois últimos critérios acima sejam atendidos, e a generate()função da instância do Genkit executa automaticamente o loop de chamada de ferramentas descrito anteriormente.

Suporte de modelo
O suporte a chamadas de ferramentas depende do modelo, da API do modelo e do plugin Genkit. Consulte a documentação relevante para determinar se a chamada de ferramentas provavelmente será suportada. Além disso:

O Genkit gerará um erro se você tentar fornecer ferramentas para um modelo que não o suporta.
Se o plugin exportar referências de modelo, a info.supports.toolspropriedade indicará se ele suporta chamadas de ferramentas.
Definindo ferramentas
Use a função da instância do Genkit defineTool()para escrever definições de ferramentas:

import { genkit, z } from 'genkit';
import { googleAI } from '@genkitai/google-ai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const getWeather = ai.defineTool(
  {
    name: 'getWeather',
    description: 'Gets the current weather in a given location',
    inputSchema: z.object({
      location: z.string().describe('The location to get the current weather for'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Here, we would typically make an API call or database query. For this
    // example, we just return a fixed value.
    return `The current weather in ${input.location} is 63°F and sunny.`;
  },
);

A sintaxe aqui se parece com a defineFlow()sintaxe; no entanto, nameos parâmetros description, e inputSchemasão obrigatórios. Ao escrever uma definição de ferramenta, tome cuidado especial com a formulação e a descrição desses parâmetros. Eles são vitais para que o LLM faça uso eficaz das ferramentas disponíveis.

Usando ferramentas
Inclua ferramentas definidas em seus prompts para gerar conteúdo.

Gerar
definePrompt
Arquivo de prompt
Bater papo
const response = await ai.generate({
  prompt: "What is the weather in Baltimore?",
  tools: [getWeather],
});

Streaming e chamada de ferramentas
Ao combinar chamadas de ferramentas com respostas de streaming, você receberá toolRequestpartes toolResponsede conteúdo nos blocos do fluxo. Por exemplo, o seguinte código:

const { stream } = ai.generateStream({
  prompt: "What is the weather in Baltimore?",
  tools: [getWeather],
});

for await (const chunk of stream) {
  console.log(chunk);
}

Pode produzir uma sequência de blocos semelhante a:

{index: 0, role: "model", content: [{text: "Okay, I'll check the weather"}]}
{index: 0, role: "model", content: [{text: "for Baltimore."}]}
// toolRequests will be emitted as a single chunk by most models
{index: 0, role: "model", content: [{toolRequest: {name: "getWeather", input: {location: "Baltimore"}}}]}
// when streaming multiple messages, Genkit increments the index and indicates the new role
{index: 1, role: "tool", content: [{toolResponse: {name: "getWeather", output: "Temperature: 68 degrees\nStatus: Cloudy."}}]}
{index: 2, role: "model", content: [{text: "The weather in Baltimore is 68 degrees and cloudy."}]}

Você pode usar esses blocos para construir dinamicamente a sequência completa de mensagens geradas.

Limitando iterações de chamadas de ferramentas commaxTurns
Ao trabalhar com ferramentas que podem acionar múltiplas chamadas sequenciais, você pode controlar o uso de recursos e evitar a execução descontrolada usando o maxTurnsparâmetro . Isso define um limite rígido para o número de interações de ida e volta que o modelo pode ter com suas ferramentas em um único ciclo de geração.

Por que usar maxTurns?

Controle de custos : evita cobranças inesperadas de uso de API devido a chamadas excessivas de ferramentas
Desempenho : garante que as respostas sejam concluídas dentro de prazos razoáveis
Segurança : Protege contra loops infinitos em interações complexas de ferramentas
Previsibilidade : torna o comportamento do seu aplicativo mais determinístico
O valor padrão é 5 voltas, o que funciona bem para a maioria dos cenários. Cada "volta" representa um ciclo completo em que o modelo pode fazer chamadas de ferramentas e receber respostas.

Exemplo: Agente de Pesquisa Web

Considere um agente de pesquisa que pode precisar pesquisar várias vezes para encontrar informações abrangentes:

const webSearch = ai.defineTool(
  {
    name: 'webSearch',
    description: 'Search the web for current information',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Simulate web search API call
    return `Search results for "${input.query}": [relevant information here]`;
  },
);

const response = await ai.generate({
  prompt: 'Research the latest developments in quantum computing, including recent breakthroughs, key companies, and future applications.',
  tools: [webSearch],
  maxTurns: 8, // Allow up to 8 research iterations
});

Exemplo: Calculadora Financeira

Aqui está um cenário mais complexo em que um agente pode precisar de várias etapas de cálculo:

const calculator = ai.defineTool(
  {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    inputSchema: z.object({
      expression: z.string().describe('Mathematical expression to evaluate'),
    }),
    outputSchema: z.number(),
  },
  async (input) => {
    // Safe evaluation of mathematical expressions
    return eval(input.expression); // In production, use a safe math parser
  },
);

const stockAnalyzer = ai.defineTool(
  {
    name: 'stockAnalyzer',
    description: 'Get current stock price and basic metrics',
    inputSchema: z.object({
      symbol: z.string().describe('Stock symbol (e.g., AAPL)'),
    }),
    outputSchema: z.object({
      price: z.number(),
      change: z.number(),
      volume: z.number(),
    }),
  },
  async (input) => {
    // Simulate stock API call
    return {
      price: 150.25,
      change: 2.50,
      volume: 45000000
    };
  },
);

Gerar
definePrompt
Arquivo de prompt
Bater papo
const response = await ai.generate({
  prompt: 'Calculate the total value of my portfolio: 100 shares of AAPL, 50 shares of GOOGL, and 200 shares of MSFT. Also calculate what percentage each holding represents.',
  tools: [calculator, stockAnalyzer],
  maxTurns: 12, // Multiple stock lookups + calculations needed
});

O que acontece quando maxTurns é atingido?

Quando o limite é atingido, o Genkit interrompe o loop de chamada de ferramentas e retorna a resposta atual do modelo, mesmo que ele esteja no meio do uso de ferramentas. O modelo normalmente fornecerá uma resposta parcial ou explicará que não conseguiu concluir todas as operações solicitadas.

Definindo ferramentas dinamicamente em tempo de execução
Como a maioria das ferramentas do Genkit precisa ser predefinida durante a inicialização do seu aplicativo, isso é necessário para que você possa interagir com suas ferramentas a partir da interface de desenvolvimento do Genkit. Normalmente, essa é a maneira recomendada. No entanto, há cenários em que a ferramenta precisa ser definida dinamicamente por solicitação do usuário.

Você pode definir ferramentas dinamicamente usando ai.dynamicTooluma função. É muito semelhante ao ai.defineToolmétodo, porém ferramentas dinâmicas não são rastreadas pelo tempo de execução do Genkit, portanto, não podem interagir com a interface de desenvolvimento do Genkit e devem ser passadas para a ai.generatechamada por referência (para ferramentas comuns, você também pode usar uma string com o nome da ferramenta).

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

ai.defineFlow('weatherFlow', async () => {
  const getWeather = ai.dynamicTool(
    {
      name: 'getWeather',
      description: 'Gets the current weather in a given location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the current weather for'),
      }),
      outputSchema: z.string(),
    },
    async (input) => {
      return `The current weather in ${input.location} is 63°F and sunny.`;
    },
  );

  const { text } = await ai.generate({
    prompt: 'What is the weather in Baltimore?',
    tools: [getWeather],
  });

  return text;
});

Ao definir ferramentas dinâmicas, para especificar esquemas de entrada e saída, você pode usar Zod, como mostrado no exemplo anterior, ou pode passar um esquema JSON construído manualmente.

const getWeather = ai.dynamicTool(
  {
    name: 'getWeather',
    description: 'Gets the current weather in a given location',
    inputJsonSchema: myInputJsonSchema,
    outputJsonSchema: myOutputJsonSchema,
  },
  async (input) => {
    /* ... */
  },
);

Ferramentas dinâmicas não requerem a função de implementação. Se você não passar a função, a ferramenta se comportará como uma interrupção e você poderá lidar manualmente com a chamada da ferramenta:

const getWeather = ai.dynamicTool({
  name: 'getWeather',
  description: 'Gets the current weather in a given location',
  inputJsonSchema: myInputJsonSchema,
  outputJsonSchema: myOutputJsonSchema,
});

Pause o loop da ferramenta usando interrupções
Por padrão, o Genkit chama o LLM repetidamente até que todas as chamadas de ferramenta sejam resolvidas. Você pode pausar a execução condicionalmente em situações em que desejar, por exemplo:

Faça uma pergunta ao usuário ou exiba a interface do usuário.
Confirme uma ação potencialmente arriscada com o usuário.
Solicitar aprovação fora de banda para uma ação.
Interrupções são ferramentas especiais que podem interromper o loop e devolver o controle ao seu código, permitindo que você lide com cenários mais avançados. Consulte o guia de interrupções para saber como usá-las.

Manipulando explicitamente chamadas de ferramentas
Se você quiser controle total sobre esse loop de chamada de ferramentas, por exemplo, para aplicar uma lógica mais complexa, defina o returnToolRequestsparâmetro como true. Agora é sua responsabilidade garantir que todas as solicitações de ferramentas sejam atendidas:

const getWeather = ai.defineTool(
  {
    // ... tool definition ...
  },
  async ({ location }) => {
    // ... tool implementation ...
  },
);

const generateOptions: GenerateOptions = {
  prompt: "What's the weather like in Baltimore?",
  tools: [getWeather],
  returnToolRequests: true,
};

let llmResponse;
while (true) {
  llmResponse = await ai.generate(generateOptions);
  const toolRequests = llmResponse.toolRequests;
  if (toolRequests.length < 1) {
    break;
  }
  const toolResponses: ToolResponsePart[] = await Promise.all(
    toolRequests.map(async (part) => {
      switch (part.toolRequest.name) {
        case 'specialTool':
          return {
            toolResponse: {
              name: part.toolRequest.name,
              ref: part.toolRequest.ref,
              output: await getWeather(part.toolRequest.input),
            },
          };
        default:
          throw Error('Tool not found');
      }
    }),
  );
  generateOptions.messages = llmResponse.messages;
  generateOptions.prompt = toolResponses;
}

