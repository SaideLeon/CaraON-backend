# CaraON API

O CaraON API é o backend para uma plataforma multi-tenant projetada para criar, gerenciar e implantar agentes de IA conversacionais no WhatsApp. Ele utiliza o `whatsapp-web.js` para se conectar às instâncias do WhatsApp, o Genkit com o Gemini Pro do Google para alimentar a lógica dos agentes e o Prisma como ORM para gerenciamento de banco de dados.

## ✨ Funcionalidades

- **Autenticação de Usuário**: Sistema de registro e login seguro com JWT.
- **Gerenciamento de Instâncias do WhatsApp**: Crie e gerencie múltiplas instâncias do WhatsApp de forma programática.
- **Conexão em Tempo Real**: Envia QR codes para autenticação do WhatsApp em tempo real para o frontend via WebSockets.
- **Agentes de IA com Persona**: Crie agentes de IA com nomes e personas personalizadas, alimentados por fluxos do Genkit.
- **Suporte a Múltiplos Inquilinos (Multi-tenancy)**: As instâncias podem ser organizadas em "Organizações" para separar clientes ou departamentos.
- **Seleção Dinâmica de Agente**: Roteia automaticamente as mensagens recebidas para o agente apropriado (agente da organização ou agente da instância).
- **Validação de Esquema**: Validação robusta de entrada de API usando Zod.
- **Documentação de API Automatizada**: Gera automaticamente a documentação da API com Swagger/OpenAPI.

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Banco de Dados**: Prisma (compatível com PostgreSQL, MySQL, etc.)
- **Sessões do WhatsApp**: MongoDB (usado pelo `wwebjs-mongo`)
- **Integração com WhatsApp**: `whatsapp-web.js`
- **Inteligência Artificial**: Google Genkit, Gemini Pro
- **Comunicação em Tempo Real**: `ws` (WebSocket)
- **Autenticação**: JSON Web Tokens (JWT)
- **Validação**: Zod
- **Documentação**: `swagger-ui-express`, `@asteasolutions/zod-to-openapi`

## 🚀 Começando

Siga estas instruções para obter uma cópia do projeto em funcionamento na sua máquina local para desenvolvimento e teste.

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm
- Um servidor de banco de dados compatível com o Prisma (ex: PostgreSQL)
- Um servidor MongoDB para armazenar as sessões do WhatsApp

### Instalação

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/SaideLeon/CaraON-backend.git
   cd CaraON-backend
   ```

2. **Instale as dependências:**
   ```sh
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis. Substitua os valores de exemplo pelos seus.
   ```env
   # URL de conexão do seu banco de dados Prisma
   DATABASE_URL="postgresql://user:password@localhost:5432/caraon?schema=public"

   # URI de conexão do seu MongoDB para sessões do WhatsApp
   MONGODB_SESSION_URI="mongodb://localhost:27017/whatsapp-sessions"

   # Chave secreta para gerar tokens JWT
   JWT_SECRET="SUA_CHAVE_SECRETA_SUPER_SECRETA"

   # Porta em que a API será executada
   PORT=3000
   ```

4. **Execute as migrações do banco de dados:**
   Isso criará as tabelas necessárias no seu banco de dados com base no `schema.prisma`.
   ```sh
   npx prisma migrate dev
   ```

5. **Inicie o servidor:**
   ```sh
   npm start
   ```
   Ou para desenvolvimento com recarregamento automático (se tiver o `nodemon` configurado):
   ```sh
   npm run dev
   ```

## 📚 Documentação da API

Após iniciar o servidor, a documentação completa da API, gerada automaticamente pelo Swagger, estará disponível em:

**`http://localhost:3000/api-docs`**

A API base está localizada em `/api/v1`. Os principais endpoints incluem:
- `/auth/register`
- `/auth/login`
- `/new/instance`
- `/user/instances`
- `/instances/:instanceId/organizations`
- `/agents`

## ⚙️ Fluxo de Trabalho

1.  **Registro/Login**: O usuário se registra e faz login para obter um token JWT.
2.  **Criação de Instância**: O usuário cria uma nova instância do WhatsApp.
3.  **Autenticação do WhatsApp**: O backend inicia uma nova sessão do `whatsapp-web.js` e envia um QR code para o frontend via WebSocket.
4.  **Conexão**: O usuário escaneia o QR code com seu telefone, e o backend estabelece a conexão, notificando o frontend.
5.  **Criação de Agente**: O usuário cria um ou mais agentes, associando-os à instância (e opcionalmente a uma organização).
6.  **Processamento de Mensagens**: Quando uma mensagem do WhatsApp é recebida, o serviço seleciona o agente apropriado, executa o fluxo do Genkit com a persona do agente e envia a resposta de volta ao usuário do WhatsApp.
