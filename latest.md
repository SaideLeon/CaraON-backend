# Atualizações Recentes na API CaraON

Este documento descreve as mudanças recentes na arquitetura da API, focando na remoção da criação de agentes e no novo esquema de conexão para o frontend.

## Principais Modificações

A principal mudança foi a simplificação do sistema de agentes, removendo a necessidade de criar e gerenciar hierarquias de agentes através da API.

1.  **Remoção da Criação de Agentes**:
    *   Ao criar uma nova instância de WhatsApp (`POST /api/v1/new/instance`), o backend **não cria mais** uma hierarquia de agentes padrão (ex: "Analista Financeiro", "Pesquisador Web"). A criação da instância agora é um processo mais simples e direto.
    *   O endpoint `PUT /api/v1/agents/hierarchy`, que era usado para configurar os agentes, foi **removido**.

2.  **Foco em RAG (Retrieval-Augmented Generation)**:
    *   A API agora assume que existe um agente pré-configurado no serviço Ariac para cada instância.
    *   A principal funcionalidade de "inteligência" é o RAG, que utiliza a base de conhecimento (alimentada por PDFs) para responder às mensagens dos usuários no WhatsApp.

## Esquema de Conexão para o Frontend

O fluxo de interação do frontend com o backend foi simplificado.

### 1. Criação e Conexão da Instância

*   **Passo 1: Criar a Instância**: O usuário inicia o processo criando uma nova instância de WhatsApp através do endpoint:
    *   `POST /api/v1/new/instance`
    *   **Body**: `{ "name": "Nome da Instância" }`
    *   **Autenticação**: `Bearer Token`

*   **Passo 2: Ouvir Eventos WebSocket**: O frontend deve se conectar ao servidor WebSocket (`ws://<seu-servidor>`) para receber eventos em tempo real.
    *   **Evento `qr_code`**: Recebe o QR code para que o usuário possa conectar seu celular.
        ```json
        {
          "type": "qr_code",
          "clientId": "...",
          "data": "data:image/png;base64,..."
        }
        ```
    *   **Evento `instance_status`**: Informa sobre mudanças no status da conexão (ex: `PENDING_QR`, `CONNECTED`, `DISCONNECTED`).
        ```json
        {
          "type": "instance_status",
          "clientId": "...",
          "status": "CONNECTED",
          "message": "Instância ... conectada com sucesso."
        }
        ```

### 2. Alimentando a Base de Conhecimento (Upload de PDF)

*   Uma vez que a instância esteja conectada, o usuário pode fazer o upload de arquivos PDF para treinar o agente.
*   **Endpoint**: `POST /api/v1/knowledge/upload-pdf/{userId}/{instanceId}`
*   **Tipo**: `multipart/form-data`
*   **Parâmetros de URL**:
    *   `userId`: ID do usuário autenticado.
    *   `instanceId`: ID da instância para a qual o PDF se destina.
*   **Form Data**:
    *   `file`: O arquivo PDF a ser enviado.
*   **Autenticação**: `Bearer Token`

### 3. Interação e Teste (Playground)

*   A interação principal do usuário final acontece diretamente pelo WhatsApp. As mensagens enviadas para o número conectado são processadas pelo backend, que consulta o agente Ariac e retorna a resposta.
*   Para **testar o agente** diretamente pelo frontend (em um "Playground"), pode-se usar o WebSocket:
    *   **Enviar Evento `playground_test`**:
        ```json
        {
          "type": "playground_test",
          "instanceId": "ID_DA_INSTANCIA",
          "messageContent": "Qual é o conteúdo do documento?",
          "userPhone": "playground_user_123"
        }
        ```
    *   **Receber Evento `playground_response_complete`**: O frontend receberá a resposta completa do agente.
        ```json
        {
          "type": "playground_response_complete",
          "response": {
            "finalResponse": "O documento fala sobre...",
            "executionId": "..."
          }
        }
        ```
    *   **Receber Evento `playground_error`**: Em caso de falha.
        ```json
        {
          "type": "playground_error",
          "error": "Mensagem de erro.",
          "executionId": "..."
        }
        ```
