const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const webSocketService = require('../services/websocket.service');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Verifica a saúde da API e seus serviços dependentes.
 */

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Retorna o status de saúde da aplicação
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: A aplicação está saudável.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Tempo em segundos que a aplicação está no ar.
 *                 message:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: number
 *                   description: Timestamp da verificação.
 *                 checks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Nome do serviço verificado.
 *                       status:
 *                         type: string
 *                         description: Status do serviço (UP/DOWN).
 *       503:
 *         description: Um ou mais serviços estão indisponíveis.
 */
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'UP' : 'DOWN';
  const wsStatus = webSocketService.isReady() ? 'UP' : 'DOWN';

  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: [
      {
        name: 'API',
        status: 'UP',
      },
      {
        name: 'MongoDB',
        status: dbStatus,
      },
      {
        name: 'WebSocket',
        status: wsStatus,
      },
    ],
  };

  try {
    if (dbState !== 1 || !webSocketService.isReady()) {
      healthcheck.message = 'NOT OK';
      res.status(503).send(healthcheck);
    } else {
      res.status(200).send(healthcheck);
    }
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).send(healthcheck);
  }
});

module.exports = router;
