# Chamada de ferramenta
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





# Plug-in MCP (Model Context Protocol)
O plug-in Genkit MCP fornece integração entre o Genkit e o Model Context Protocol (MCP). O MCP é um padrão aberto que permite que os desenvolved
ores criem "servidores" que fornecem ferramentas, recursos e prompts aos clientes. O Genkit MCP permite que os desenvolvedores do Genkit:

Consuma ferramentas, prompts e recursos do MCP como um cliente usando ou .createMcpHostcreateMcpClient
Forneça ferramentas e prompts do Genkit como um servidor MCP usando o .createMcpServer
Instalação
Para começar, você precisará do Genkit e do plug-in MCP:

Janela do terminal
npm i genkit @genkit-ai/mcp

MCP Host
Para se conectar a um ou mais servidores MCP, use a função. Essa função retorna uma instância que gerencia conexões com os servidores MCP configurados.createMcpHostGenkitMcpHost

import { googleAI } from '@genkit-ai/googleai';
import { createMcpHost } from '@genkit-ai/mcp';
import { genkit } from 'genkit';

const mcpHost = createMcpHost({
  name: 'myMcpClients', // A name for the host plugin itself
  mcpServers: {
    // Each key (e.g., 'fs', 'git') becomes a namespace for the server's tools.
    fs: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
    memory: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
  },
});

const ai = genkit({
  plugins: [googleAI()],
});

(async () => {
  // Provide MCP tools to the model of your choice.
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.0-flash'),
    prompt: `Analyze all files in ${process.cwd()}.`,
    tools: await mcpHost.getActiveTools(ai),
    resources: await mcpHost.getActiveResources(ai),
  });

  console.log(text);

  await mcpHost.close();
})();

A função inicializa uma instância, que lida com o ciclo de vida e a comunicação com os servidores MCP definidos.createMcpHostGenkitMcpHost

createMcpHost() Opções
export interface McpHostOptions {
  /**
   * An optional client name for this MCP host. This name is advertised to MCP Servers
   * as the connecting client name. Defaults to 'genkit-mcp'.
   */
  name?: string;
  /**
   * An optional version for this MCP host. Primarily for
   * logging and identification within Genkit.
   * Defaults to '1.0.0'.
   */
  version?: string;
  /**
   * A record for configuring multiple MCP servers. Each server connection is
   * controlled by a `GenkitMcpClient` instance managed by `GenkitMcpHost`.
   * The key in the record is used as the identifier for the MCP server.
   */
  mcpServers?: Record<string, McpServerConfig>;
  /**
   * If true, tool responses from the MCP server will be returned in their raw
   * MCP format. Otherwise (default), they are processed and potentially
   * simplified for better compatibility with Genkit's typical data structures.
   */
  rawToolResponses?: boolean;
  /**
   * When provided, each connected MCP server will be sent the roots specified here.
   * Overridden by any specific roots sent in the `mcpServers` config for a given server.
   */
  roots?: Root[];
}

/**
 * Configuration for an individual MCP server. The interface should be familiar
 * and compatible with existing tool configurations e.g. Cursor or Claude
 * Desktop.
 *
 * In addition to stdio servers, remote servers are supported via URL and
 * custom/arbitary transports are supported as well.
 */
export type McpServerConfig = (
  | McpStdioServerConfig
  | McpStreamableHttpConfig
  | McpTransportServerConfig
) &
  McpServerControls;


export type McpStdioServerConfig = StdioServerParameters;

export type McpStreamableHttpConfig = {
  url: string;
} & Omit<StreamableHTTPClientTransportOptions, 'sessionId'>;

export type McpTransportServerConfig = {
  transport: Transport;
};

export interface McpServerControls {
  /**
   * when true, the server will be stopped and its registered components will
   * not appear in lists/plugins/etc
   */
  disabled?: boolean;
  /** MCP roots configuration. See: https://modelcontextprotocol.io/docs/concepts/roots */
  roots?: Root[];
}

// from '@modelcontextprotocol/sdk/client/stdio.js'
export type StdioServerParameters = {
  /**
   * The executable to run to start the server.
   */
  command: string;
  /**
   * Command line arguments to pass to the executable.
   */
  args?: string[];
  /**
   * The environment to use when spawning the process.
   *
   * If not specified, the result of getDefaultEnvironment() will be used.
   */
  env?: Record<string, string>;
  /**
   * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`.
   *
   * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
   */
  stderr?: IOType | Stream | number;
  /**
   * The working directory to use when spawning the process.
   *
   * If not specified, the current working directory will be inherited.
   */
  cwd?: string;
};

// from '@modelcontextprotocol/sdk/client/streamableHttp.js'
export type StreamableHTTPClientTransportOptions = {
  /**
   * An OAuth client provider to use for authentication.
   *
   * When an `authProvider` is specified and the connection is started:
   * 1. The connection is attempted with any existing access token from the `authProvider`.
   * 2. If the access token has expired, the `authProvider` is used to refresh the token.
   * 3. If token refresh fails or no access token exists, and auth is required, `OAuthClientProvider.redirectToAuthorization` is called, and an `UnauthorizedError` will be thrown from `connect`/`start`.
   *
   * After the user has finished authorizing via their user agent, and is redirected back to the MCP client application, call `StreamableHTTPClientTransport.finishAuth` with the authorization code before retrying the connection.
   *
   * If an `authProvider` is not provided, and auth is required, an `UnauthorizedError` will be thrown.
   *
   * `UnauthorizedError` might also be thrown when sending any message over the transport, indicating that the session has expired, and needs to be re-authed and reconnected.
   */
  authProvider?: OAuthClientProvider;
  /**
   * Customizes HTTP requests to the server.
   */
  requestInit?: RequestInit;
  /**
   * Custom fetch implementation used for all network requests.
   */
  fetch?: FetchLike;
  /**
   * Options to configure the reconnection behavior.
   */
  reconnectionOptions?: StreamableHTTPReconnectionOptions;
  /**
   * Session ID for the connection. This is used to identify the session on the server.
   * When not provided and connecting to a server that supports session IDs, the server will generate a new session ID.
   */
  sessionId?: string;
};

Cliente MCP (servidor único)
Para cenários em que você só precisa se conectar a um único servidor MCP ou prefere gerenciar instâncias de cliente individualmente, você pode usar o .createMcpClient

import { googleAI } from '@genkit-ai/googleai';
import { createMcpClient } from '@genkit-ai/mcp';
import { genkit } from 'genkit';

const myFsClient = createMcpClient({
  name: 'myFileSystemClient', // A unique name for this client instance
  mcpServer: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
  },
  // rawToolResponses: true, // Optional: get raw MCP responses
});

// In your Genkit configuration:
const ai = genkit({
  plugins: [googleAI()],
});

(async () => {
  await myFsClient.ready();

  // Retrieve tools from this specific client
  const fsTools = await myFsClient.getActiveTools(ai);

  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.0-flash'), // Replace with your model
    prompt: 'List files in ' + process.cwd(),
    tools: fsTools,
  });
  console.log(text);

  await myFsClient.disable();
})();

createMcpClient() Opções
A função recebe um objeto:createMcpClientMcpClientOptions

name: (obrigatório, cadeia de caracteres) Um nome exclusivo para esta instância do cliente. Esse nome será usado como namespace para suas ferramentas e prompts.
version: (opcional, string) Versão para esta instância do cliente. O padrão é "1.0.0".
Além disso, ele suporta todas as opções de (por exemplo, , , e configurações de transporte), conforme detalhado na seção de opções.McpServerConfigdisabledrawToolResponsescreateMcpHost
Usando ações do MCP (ferramentas, prompts)
Ambos (via ) e (via ) descobrem as ferramentas disponíveis de seus servidores MCP conectados e habilitados. Essas ferramentas são instâncias padrão do Genkit e podem ser fornecidas aos modelos do Genkit.GenkitMcpHostgetActiveTools()GenkitMcpClientgetActiveTools()ToolAction

Os prompts do MCP podem ser buscados usando ou . Eles retornam um .McpHost.getPrompt(serverName, promptName)mcpClient.getPrompt(promptName)ExecutablePrompt

Todas as ações do MCP (ferramentas, prompts, recursos) são namespaced.

Para , o namespace é a chave que você fornece para esse servidor na configuração (por exemplo, ).createMcpHostmcpServerslocalFs/read_file
Para , o namespace é o que você fornece em suas opções (por exemplo, ).createMcpClientnamemyFileSystemClient/list_resources
Respostas da ferramenta
As ferramentas MCP retornam uma matriz em oposição a uma resposta estruturada como a maioria das ferramentas Genkit. O plug-in Genkit MCP tenta analisar e coagir o conteúdo retornado:content

Se o conteúdo for texto e JSON válido, ele será analisado e retornado como um objeto JSON.
Se o conteúdo for texto, mas não JSON válido, o texto bruto será retornado.
Se o conteúdo contiver uma única parte não textual (por exemplo, uma imagem), essa parte será retornada diretamente.
Se o conteúdo contiver várias partes ou partes mistas (por exemplo, texto e uma imagem), a matriz de resposta de conteúdo completa será retornada.
Servidor MCP
Você também pode expor todas as ferramentas e prompts de uma instância do Genkit como um servidor MCP usando a função.createMcpServer

import { googleAI } from '@genkit-ai/googleai';
import { createMcpServer } from '@genkit-ai/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { genkit, z } from 'genkit/beta';

const ai = genkit({
  plugins: [googleAI()],
});

ai.defineTool(
  {
    name: 'add',
    description: 'add two numbers together',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  },
  async ({ a, b }) => {
    return a + b;
  }
);

ai.definePrompt(
  {
    name: 'happy',
    description: 'everybody together now',
    input: {
      schema: z.object({
        action: z.string().default('clap your hands').optional(),
      }),
    },
  },
  `If you're happy and you know it, {{action}}.`
);

ai.defineResource(
  {
    name: 'my resouces',
    uri: 'my://resource',
  },
  async () => {
    return {
      content: [
        {
          text: 'my resource',
        },
      ],
    };
  }
);

ai.defineResource(
  {
    name: 'file',
    template: 'file://{path}',
  },
  async ({ uri }) => {
    return {
      content: [
        {
          text: `file contents for ${uri}`,
        },
      ],
    };
  }
);

// Use createMcpServer
const server = createMcpServer(ai, {
  name: 'example_server',
  version: '0.0.1',
});
// Setup (async) then starts with stdio transport by default
server.setup().then(async () => {
  await server.start();
  const transport = new StdioServerTransport();
  await server!.server?.connect(transport);
});

A função retorna uma instância. O método nesta instância iniciará um servidor MCP (usando o transporte stdio por padrão) que expõe todas as ferramentas e prompts registrados do Genkit. Para iniciar o servidor com um transporte MCP diferente, você pode passar a instância de transporte para o método (por exemplo, ).createMcpServerGenkitMcpServerstart()start()server.start(customMcpTransport)

createMcpServer() Opções
name: (obrigatório, string) O nome que você deseja dar ao servidor para inspeção MCP.
version: (opcional, string) A versão que seu servidor anunciará aos clientes. O padrão é "1.0.0".
Limitações conhecidas
Os prompts do MCP só podem usar parâmetros de string, portanto, as entradas para esquemas devem ser objetos com apenas valores de propriedade de string.
O MCP solicita apenas suporte e mensagens. mensagens não são suportadas.usermodelsystem
Os prompts do MCP são compatíveis apenas com um único "tipo" em uma mensagem, portanto, você não pode misturar mídia e texto na mesma mensagem.
Testando seu servidor MCP
Você pode testar seu servidor MCP usando o inspetor oficial. Por exemplo, se o código do servidor for compilado no , você poderá executar:dist/index.js

npx @modelcontextprotocol/inspector dist/index.js

Depois de iniciar o inspetor, você pode listar prompts e ações e testá-los manualmente.

