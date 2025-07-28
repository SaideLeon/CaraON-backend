import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import authRoutes from './api/auth.routes.js';
import instanceRoutes from './api/instances.routes.js';
import organizationRoutes from './api/organization.routes.js';
import agentRoutes from './api/agent.routes.js';
import productRoutes from './api/products.routes.js';
import orderRoutes from './api/orders.routes.js';
import cartRoutes from './api/cart.routes.js';
import toolRoutes from './api/tool.routes.js';
import categoryRoutes from './api/category.routes.js';
import brandRoutes from './api/brand.routes.js';
import healthRoutes from './api/health.routes.js';
import messageRoutes from './api/message.routes.js';
import contactRoutes from './api/contact.routes.js';
import * as webSocketService from './services/websocket.service.js';
import generateOpenApi from './docs/openapi.js';
import '../genkit.config.js';
const app = express();
const PORT = process.env.PORT || 3000;
const API_SERVER_URLS = process.env.API_SERVER_URLS || `http://localhost:${PORT}`;

const servers = API_SERVER_URLS.split(',').map(url => ({ url, description: 'API Server' }));

generateOpenApi(app, servers);

app.use(cors({ origin: '*' }));
app.use(express.json());

import { createSystemTools } from './services/tools.service.js';

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
app.use('/api/v1', orderRoutes);

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
