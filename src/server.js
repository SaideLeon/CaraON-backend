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
const templateRoutes = require('./api/template.routes');
const toolRoutes = require('./api/tool.routes');
const categoryRoutes = require('./api/category.routes');
const brandRoutes = require('./api/brand.routes');
const webSocketService = require('./services/websocket.service');

// Swagger UI setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CaraON API',
      version: '1.0.0',
      description: 'Documentação da API CaraON',
    },
  },
  apis: ['./src/api/*.js'], // You can add JSDoc comments to your route files for more details
});

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint para health check (adicione aqui)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
mongoose.connect(process.env.MONGODB_SESSION_URI).then(() => {
  console.log('✅ Conectado ao MongoDB para sessões WhatsApp');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', instanceRoutes);
app.use('/api/v1', organizationRoutes);
app.use('/api/v1', agentRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', cartRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/tools', toolRoutes);
app.use('/api/v1', categoryRoutes);
app.use('/api/v1', brandRoutes);

const server = http.createServer(app);
webSocketService.init(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 API e WebSocket rodando na porta ${PORT}`);
  console.log(`📚 Documentação da API disponível em: http://localhost:${PORT}/api-docs`);
});
