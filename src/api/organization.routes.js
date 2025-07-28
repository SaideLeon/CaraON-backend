import express from 'express';
const router = express.Router();
import organizationController from '../controllers/organization.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createOrganizationSchema, listOrganizationsSchema } from '../schemas/organization.schema.js';
import auth from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Organizações
 *   description: Gerenciamento de organizações dentro de uma instância.
 */

/**
 * @swagger
 * /api/v1/instances/{instanceId}/organizations:
 *   post:
 *     summary: Cria uma nova organização em uma instância
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância onde a organização será criada.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrganization'
 *           examples:
 *             salesDept:
 *               summary: Departamento de Vendas
 *               value:
 *                 name: "Departamento de Vendas - TechCell"
 *             supportDept:
 *               summary: Departamento de Suporte
 *               value:
 *                 name: "Departamento de Suporte Técnico - TechCell"
 *     responses:
 *       201:
 *         description: Organização criada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao criar a organização.
 *   get:
 *     summary: Lista todas as organizações de uma instância
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da instância.
 *     responses:
 *       200:
 *         description: Lista de organizações.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Instância não encontrada.
 *       500:
 *         description: Falha ao listar as organizações.
 */

router.post(
  '/instances/:instanceId/organizations',
  auth,
  validate(createOrganizationSchema),
  organizationController.createOrganization
);

router.get(
  '/instances/:instanceId/organizations',
  auth,
  validate(listOrganizationsSchema),
  organizationController.listOrganizations
);

export default router;
