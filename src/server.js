require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./api/auth.routes');
const instanceRoutes = require('./api/instances.routes');
const organizationRoutes = require('./api/organization.routes');
const agentRoutes = require('./api/agent.routes');
const webSocketService = require('./services/websocket.service');
const { generateOpenApi } = require('./docs/openapi');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Endpoint para health check (adicione aqui)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
mongoose.connect(process.env.MONGODB_SESSION_URI).then(() => {
  console.log('✅ Conectado ao MongoDB para sessões WhatsApp');
});


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', instanceRoutes);
app.use('/api/v1', organizationRoutes);
app.use('/api/v1', agentRoutes);
 

generateOpenApi(app);

const server = http.createServer(app);
webSocketService.init(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 API e WebSocket rodando na porta ${PORT}`);
  console.log(`📚 Documentação da API disponível em: http://localhost:${PORT}/api-docs`);
});
