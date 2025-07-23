# CaraON API Documentation

This document provides a comprehensive overview of the CaraON API, including authentication, user management, and other core functionalities.

## API Information

*   **Version:** 1.0.0
*   **Title:** CaraON API
*   **Description:** Documentação da API do CaraON
*   **Servers:**
    *   `/api/v1`

## Tags

*   **Auth:** Operações de autenticação
*   **Users:** Operações relacionadas a usuários
*   **Instances:** Gerenciamento de instâncias do WhatsApp
*   **Organizations:** Gerenciamento de organizações
*   **Agents:** Gerenciamento de agentes de IA
*   **Products:** Gerenciamento de produtos
*   **Cart:** Operações de carrinho de compras
*   **Orders:** Gerenciamento de pedidos

## Paths

### Auth

#### POST /auth/register

Register a new user.

**Tags:** Auth

**Request Body:**
```json
{
  "name": "string",
  "email": "user@example.com",
  "password": "password123"
}
```

**Responses:**
*   **201 Created:** User registered successfully
*   **400 Bad Request:** Bad request

#### POST /auth/login

Login a user.

**Tags:** Auth

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Responses:**
*   **200 OK:** User logged in successfully
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
*   **401 Unauthorized:** Unauthorized

### Test

#### GET /test

A simple test endpoint.

**Responses:**
*   **200 OK:** Successful response
    ```json
    {
      "message": "Hello from OpenAPI!"
    }
    ```

## Components

### Schemas

#### UserRegistration

**Type:** object

**Properties:**
*   `name` (string): Nome do usuário (min 3 characters)
*   `email` (string, email format): Email do usuário
*   `password` (string): Senha do usuário (min 6 characters)

**Required:** `name`, `email`, `password`

#### UserLogin

**Type:** object

**Properties:**
*   `email` (string, email format): Email do usuário
*   `password` (string): Senha do usuário

**Required:** `email`, `password`

### Security Schemes

#### bearerAuth

**Type:** http
**Scheme:** bearer
**Bearer Format:** JWT