

# Documentação da API CaraON para Desenvolvimento Frontend

## Visão Geral

Esta documentação detalha a API RESTful e a comunicação WebSocket para o projeto CaraON. O objetivo é fornecer a um desenvolvedor frontend (ou a uma IA especialista em frontend) todas as informações necessárias para construir uma interface de usuário completa e funcional.

A API é versionada e o base path para todas as rotas é `/api/v1`.

## Autenticação

A maioria das rotas da API requer autenticação via JSON Web Token (JWT).

1.  O usuário se registra ou faz login para obter um token.
2.  O token JWT deve ser incluído no cabeçalho `Authorization` de todas as requisições subsequentes como um Bearer Token.

**Exemplo de Cabeçalho:**
```
Authorization: Bearer <SEU_TOKEN_JWT>
```

---

## Fluxo de Trabalho Comum

1.  **Registro/Login:** O usuário cria uma conta ou faz login para obter um token JWT.
2.  **Listar Instâncias:** O frontend busca as instâncias existentes do usuário.
3.  **Criar Instância:** O usuário cria uma nova instância de WhatsApp.
4.  **Conexão WebSocket:** O frontend estabelece uma conexão WebSocket para receber o QR Code e atualizações de status da nova instância.
5.  **Escanear QR Code:** O usuário escaneia o QR Code exibido no frontend com seu aplicativo WhatsApp.
6.  **Gerenciar Organizações e Agentes:** Após a conexão da instância, o usuário pode criar organizações dentro da instância e atribuir agentes a elas ou diretamente à instância.

---

## Endpoints da API

### 1. Autenticação (`/auth`)

#### 1.1. Registrar um Novo Usuário

*   **Endpoint:** `POST /api/v1/auth/register`
*   **Descrição:** Cria uma nova conta de usuário.
*   **Autenticação:** Não requerida.
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Nome do Usuário",
      "email": "usuario@exemplo.com",
      "password": "senha_super_segura"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "clx...",
      "name": "Nome do Usuário",
      "email": "usuario@exemplo.com"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Dados de entrada inválidos (e.g., email inválido, senha curta).
    *   `409 Conflict`: O email fornecido já está em uso.
*   **Exemplo com `curl`:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{ \
      "name": "Nome do Usuário", \
      "email": "usuario@exemplo.com", \
      "password": "senha_super_segura" \
    }'
    ```

#### 1.2. Autenticar um Usuário (Login)

*   **Endpoint:** `POST /api/v1/auth/login`
*   **Descrição:** Autentica um usuário e retorna um token JWT.
*   **Autenticação:** Não requerida.
*   **Request Body:** `application/json`
    ```json
    {
      "email": "usuario@exemplo.com",
      "password": "senha_super_segura"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Senha incorreta.
    *   `404 Not Found`: Usuário não encontrado.
*   **Exemplo com `curl`:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{ \
      "email": "usuario@exemplo.com", \
      "password": "senha_super_segura" \
    }'
    ```

---

### 2. Instâncias (`/`)

#### 2.1. Criar uma Nova Instância do WhatsApp

*   **Endpoint:** `POST /api/v1/new/instance`
*   **Descrição:** Inicia o processo de criação de uma nova instância de WhatsApp para o usuário autenticado. A conexão real é estabelecida em segundo plano e o QR Code é enviado via WebSocket.
*   **Autenticação:** Requerida (Bearer Token).
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Minha Instância de Vendas"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Instância criada com sucesso. Aguarde o QR Code via WebSocket.",
      "instance": {
        "id": "clx...",
        "name": "Minha Instância de Vendas",
        "clientId": "user_id-timestamp",
        "userId": "clx..."
      }
    }
    ```
*   **Exemplo com `curl`:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/new/instance \
    -H "Authorization: Bearer <SEU_TOKEN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{ \
      "name": "Minha Instância de Vendas" \
    }'
    ```

#### 2.2. Listar Instâncias do Usuário

*   **Endpoint:** `GET /api/v1/user/instances`
*   **Descrição:** Retorna uma lista de todas as instâncias de WhatsApp criadas pelo usuário autenticado.
*   **Autenticação:** Requerida (Bearer Token).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": "clx...",
        "name": "Minha Instância de Vendas",
        "clientId": "user_id-timestamp1",
        "userId": "clx..."
      },
      {
        "id": "cly...",
        "name": "Instância de Suporte",
        "clientId": "user_id-timestamp2",
        "userId": "clx..."
      }
    ]
    ```
*   **Exemplo com `curl`:**
    ```bash
    curl -X GET http://localhost:3000/api/v1/user/instances \
    -H "Authorization: Bearer <SEU_TOKEN_JWT>"
    ```

---

### 3. Organizações (`/instances/{instanceId}/organizations`)

#### 3.1. Criar uma Nova Organização

*   **Endpoint:** `POST /api/v1/instances/:instanceId/organizations`
*   **Descrição:** Cria uma nova organização dentro de uma instância de WhatsApp específica.
*   **Autenticação:** Requerida (Bearer Token).
*   **URL Parameters:**
    *   `instanceId` (string): O ID da instância onde a organização será criada.
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Equipe de Suporte Nível 1"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "clz...",
      "name": "Equipe de Suporte Nível 1",
      "instanceId": "clx..."
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: A `instanceId` fornecida não existe.
*   **Exemplo com `curl`:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/instances/clx.../organizations \
    -H "Authorization: Bearer <SEU_TOKEN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{ \
      "name": "Equipe de Suporte Nível 1" \
    }'
    ```

---

### 4. Agentes (`/agents`)

#### 4.1. Criar um Novo Agente

*   **Endpoint:** `POST /api/v1/agents`
*   **Descrição:** Cria um novo agente de IA e o associa a uma instância ou a uma organização específica dentro de uma instância.
*   **Autenticação:** Requerida (Bearer Token).
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Agente de Boas-Vindas",
      "flowId": "greetingFlow",
      "persona": "Você é um assistente amigável e prestativo.",
      "instanceId": "clx...",
      "organizationId": "clz..." // Opcional. Se nulo, o agente pertence à instância.
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "cla...",
      "name": "Agente de Boas-Vindas",
      "flowId": "greetingFlow",
      "persona": "Você é um assistente amigável e prestativo.",
      "instanceId": "clx...",
      "organizationId": "clz..."
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: A `instanceId` ou `organizationId` não foi encontrada.
*   **Exemplo com `curl`:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/agents \
    -H "Authorization: Bearer <SEU_TOKEN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{ \
      "name": "Agente de Boas-Vindas", \
      "flowId": "greetingFlow", \
      "persona": "Você é um assistente amigável e prestativo.", \
      "instanceId": "clx...", \
      "organizationId": "clz..." \
    }'
    ```

#### 4.2. Atualizar a Persona de um Agente

*   **Endpoint:** `PATCH /api/v1/agents/:agentId/persona`
*   **Descrição:** Atualiza a persona (instruções de comportamento) de um agente existente.
*   **Autenticação:** Requerida (Bearer Token).
*   **URL Parameters:**
    *   `agentId` (string): O ID do agente a ser atualizado.
*   **Request Body:** `application/json`
    ```json
    {
      "persona": "Você é um especialista técnico que fornece respostas diretas e precisas."
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": "cla...",
      "name": "Agente de Boas-Vindas",
      "flowId": "greetingFlow",
      "persona": "Você é um especialista técnico que fornece respostas diretas e precisas.",
      "instanceId": "clx...",
      "organizationId": "clz..."
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: O `agentId` não foi encontrado.
*   **Exemplo com `curl`:**
    ```bash
    curl -X PATCH http://localhost:3000/api/v1/agents/cla.../persona \
    -H "Authorization: Bearer <SEU_TOKEN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{ \
      "persona": "Você é um especialista técnico que fornece respostas diretas e precisas." \
    }'
    ```

---

## Comunicação via WebSocket

O frontend deve se conectar ao servidor WebSocket para receber eventos em tempo real, principalmente para o processo de conexão de instâncias do WhatsApp.

*   **URL de Conexão:** `ws://localhost:3000`

### Eventos Recebidos do Servidor

O servidor envia objetos JSON com uma propriedade `type` que identifica o evento.

#### 1. QR Code para Conexão

*   **`type`**: `qr_code`
*   **Descrição:** Enviado quando uma nova instância precisa de autenticação via QR Code. O frontend deve renderizar esta imagem para o usuário escanear.
*   **Payload:**
    ```json
    {
      "type": "qr_code",
      "clientId": "user_id-timestamp",
      "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." // String base64 da imagem do QR Code
    }
    ```

#### 2. Atualização de Status da Instância

*   **`type`**: `instance_status`
*   **Descrição:** Informa sobre mudanças no estado de uma instância (conectada, desconectada).
*   **Payload:**
    ```json
    {
      "type": "instance_status",
      "clientId": "user_id-timestamp",
      "status": "connected" | "disconnected",
      "message": "Instância [clientId] conectada com sucesso."
    }
    ```

### Exemplo de Implementação Frontend (JavaScript)

```javascript
const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
  console.log('Conexão WebSocket estabelecida.');
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'qr_code':
      // Lógica para exibir o QR Code para o usuário
      // Ex: document.getElementById('qrcode-image').src = message.data;
      console.log(`QR Code recebido para a instância: ${message.clientId}`);
      break;

    case 'instance_status':
      // Lógica para atualizar a UI com o novo status da instância
      // Ex: updateInstanceStatusUI(message.clientId, message.status);
      console.log(`Status da instância ${message.clientId}: ${message.status} - ${message.message}`);
      break;

    default:
      console.log('Mensagem WebSocket desconhecida:', message);
  }
};

socket.onclose = () => {
  console.log('Conexão WebSocket fechada.');
};

socket.onerror = (error) => {
  console.error('Erro no WebSocket:', error);
};
```
