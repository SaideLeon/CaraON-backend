require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const authRoutes = require('./api/auth.routes');
const instanceRoutes = require('./api/instances.routes');
const organizationRoutes = require('./api/organization.routes');
const agentRoutes = require('./api/agent.routes');
const productRoutes = require('./api/products.routes');
const cartRoutes = require('./api/cart.routes');

const toolRoutes = require('./api/tool.routes');
const categoryRoutes = require('./api/category.routes');
const brandRoutes = require('./api/brand.routes');
const healthRoutes = require('./api/health.routes'); // Importa a nova rota
const messageRoutes = require('./api/message.routes'); // Importa a rota de mensagens
const contactRoutes = require('./api/contact.routes'); // Importa a rota de contatos
const webSocketService = require('./services/websocket.service');
const { generateOpenApi } = require('./docs/openapi');
require('../genkit.config.js');
const app = express();
const PORT = process.env.PORT || 3000;
const API_SERVER_URLS = process.env.API_SERVER_URLS || `http://localhost:${PORT}`;

const servers = API_SERVER_URLS.split(',').map(url => ({ url, description: 'API Server' }));

generateOpenApi(app, servers);

app.use(cors({ origin: '*' }));
app.use(express.json());

const { createSystemTools } = require('./services/tools.service');

mongoose.connect(process.env.MONGODB_SESSION_URI).then(() => {
  console.log('✅ Conectado ao MongoDB para sessões WhatsApp');
  // Cria as ferramentas padrão do sistema após a conexão com o banco de dados
  createSystemTools();
});

// Rotas da API
app.use('/api/v1', healthRoutes); // Adiciona a rota de health check
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', instanceRoutes);
app.use('/api/v1', organizationRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', cartRoutes);

app.use('/api/v1/tools', toolRoutes);
app.use('/api/v1', categoryRoutes);
app.use('/api/v1', brandRoutes);
app.use('/api/v1', messageRoutes);
app.use('/api/v1', contactRoutes);

const server = http.createServer(app);
webSocketService.init(server);

server.listen(PORT, () => {
  console.log(`🚀 API e WebSocket rodando na porta ${PORT}`);
  console.log(`📚 Documentação da API disponível em: http://localhost:${PORT}/api-docs`);
});
