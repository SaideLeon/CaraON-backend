quero quero fazer mudança total apenas na forma como agentes sao criados e usados, quero aproveitar sistema ariac para   │
│    criação de agente de um jeito de eliminar os metodos antigos e integre a nova api @prompter.txt e crie docs

Uma refatoração completa do sistema de agentes para usar a nova API 'ariac'.

  Meu plano é o seguinte:

   1. Novo Serviço: Criarei src/services/ariac.service.js para interagir com a API externa.
   2. Novas Rotas de Agente: Substituirei as rotas em src/api/agent.routes.js. A principal será PUT /api/v1/agents/hierarchy para
       configurar a hierarquia via 'ariac'. As rotas antigas serão removidas.
   3. Integração com WhatsApp: O processamento de mensagens em src/services/whatsapp.service.js será modificado para chamar a API
       de chat da 'ariac', em vez do sistema de agentes local.
   4. Limpeza de Código e Banco de Dados: Removerei os serviços de agente antigos (agent.core.service.js,
      agent.execution.service.js, agent.hierarchy.service.js, tools.service.js) e os modelos de dados relacionados a agentes do
      prisma/schema.prisma (Agent, Tool, AgentExecution, etc.).
   5. Documentação: Atualizarei a documentação da API (Swagger) para refletir os novos endpoints.
