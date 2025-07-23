const express = require('express');
const router = express.Router();
const productController = require('../controllers/products.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createProductSchema, updateProductSchema, listProductsSchema } = require('../schemas/product.schema');
const auth = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ProductStatus:
 *       type: string
 *       enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED]
 *       description: O status do produto.
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: O ID do produto (gerado automaticamente).
 *           readOnly: true
 *         name:
 *           type: string
 *           description: O nome do produto.
 *         slug:
 *           type: string
 *           description: O slug único para a URL do produto.
 *         description:
 *           type: string
 *           description: A descrição completa do produto.
 *         shortDescription:
 *           type: string
 *           description: Uma descrição curta do produto.
 *         sku:
 *           type: string
 *           description: O SKU (Stock Keeping Unit) único do produto.
 *         price:
 *           type: number
 *           format: float
 *           description: O preço do produto.
 *         comparePrice:
 *           type: number
 *           format: float
 *           description: O preço de comparação (preço "de").
 *         cost:
 *           type: number
 *           format: float
 *           description: O custo do produto para o vendedor.
 *         weight:
 *           type: number
 *           format: float
 *           description: O peso do produto.
 *         length:
 *           type: number
 *           format: float
 *           description: O comprimento do produto.
 *         width:
 *           type: number
 *           format: float
 *           description: A largura do produto.
 *         height:
 *           type: number
 *           format: float
 *           description: A altura do produto.
 *         status:
 *           $ref: '#/components/schemas/ProductStatus'
 *         isDigital:
 *           type: boolean
 *           description: Indica se o produto é digital.
 *         trackStock:
 *           type: boolean
 *           description: Indica se o estoque do produto deve ser rastreado.
 *         stock:
 *           type: integer
 *           description: A quantidade em estoque.
 *         minStock:
 *           type: integer
 *           description: O nível mínimo de estoque.
 *         maxStock:
 *           type: integer
 *           description: O nível máximo de estoque.
 *         featured:
 *           type: boolean
 *           description: Indica se o produto está em destaque.
 *         categoryId:
 *           type: string
 *           description: O ID da categoria do produto.
 *         brandId:
 *           type: string
 *           description: O ID da marca do produto.
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags associadas ao produto.
 *         seoTitle:
 *           type: string
 *           description: Título para SEO.
 *         seoDescription:
 *           type: string
 *           description: Descrição para SEO.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Data de criação.
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização.
 *           readOnly: true
 *       required:
 *         - name
 *         - slug
 *         - sku
 *         - price
 *         - categoryId
 *     ProductUpdate:
 *       type: object
 *       description: Campos para atualizar um produto. Todos são opcionais.
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           format: float
 *         status:
 *           $ref: '#/components/schemas/ProductStatus'
 *         stock:
 *           type: integer
 *         featured:
 *           type: boolean
 *         categoryId:
 *           type: string
 *         brandId:
 *           type: string
 *     ProductListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Lista todos os produtos com filtros e paginação
 *     tags: [Produtos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: O número da página a ser retornada.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: O número de itens por página.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca para nome, descrição, SKU ou tags do produto.
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filtra produtos por ID da categoria.
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filtra produtos por ID da marca.
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/ProductStatus'
 *         description: Filtra produtos por status.
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filtra por produtos em destaque.
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Preço mínimo do produto.
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Preço máximo do produto.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo para ordenação.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem da ordenação.
 *     responses:
 *       200:
 *         description: Lista de produtos retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListResponse'
 *       500:
 *         description: Falha ao listar os produtos.
 *   post:
 *     summary: Cria um novo produto
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *           examples:
 *             samsungPhone:
 *               summary: Exemplo de um celular Samsung
 *               value:
 *                 name: "Samsung Galaxy S24 Ultra"
 *                 slug: "samsung-galaxy-s24-ultra"
 *                 description: "O mais recente e poderoso smartphone da Samsung, com câmera de 200MP, S Pen integrada e o processador mais rápido da linha Galaxy."
 *                 shortDescription: "Smartphone topo de linha com S Pen e câmera de 200MP."
 *                 sku: "SS-S24-ULTRA-BLK"
 *                 price: 7999.99
 *                 comparePrice: 8999.99
 *                 cost: 4500.00
 *                 weight: 0.232
 *                 length: 16.23
 *                 width: 7.9
 *                 height: 0.86
 *                 status: "ACTIVE"
 *                 isDigital: false
 *                 trackStock: true
 *                 stock: 150
 *                 minStock: 20
 *                 maxStock: 200
 *                 featured: true
 *                 categoryId: "687ff9a2bcbad9eaf73eb33a"
 *                 brandId: "clxkz3a1b0002i8uhf4g9h9j9"
 *                 tags: ["smartphone", "samsung", "android", "s24 ultra"]
 *                 seoTitle: "Comprar Samsung Galaxy S24 Ultra | Loja Oficial"
 *                 seoDescription: "Encontre o melhor preço para o novo Samsung Galaxy S24 Ultra. Câmera de 200MP, performance incrível e design premium. Compre já!"
 *     responses:
 *       201:
 *         description: Produto criado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Categoria ou marca não encontrada.
 *       409:
 *         description: Conflito, SKU ou slug já existe.
 */

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Obtém um produto pelo seu ID
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do produto.
 *     responses:
 *       200:
 *         description: Produto retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *             examples:
 *               samsungPhone:
 *                 summary: Exemplo de um celular Samsung
 *                 value:
 *                   id: "clxkz5f2q0004i8uhc7a2g6h3"
 *                   name: "Samsung Galaxy S24 Ultra"
 *                   slug: "samsung-galaxy-s24-ultra"
 *                   description: "O mais recente e poderoso smartphone da Samsung, com câmera de 200MP, S Pen integrada e o processador mais rápido da linha Galaxy."
 *                   shortDescription: "Smartphone topo de linha com S Pen e câmera de 200MP."
 *                   sku: "SS-S24-ULTRA-BLK"
 *                   price: 7999.99
 *                   comparePrice: 8999.99
 *                   cost: 4500.00
 *                   weight: 0.232
 *                   length: 16.23
 *                   width: 7.9
 *                   height: 0.86
 *                   status: "ACTIVE"
 *                   isDigital: false
 *                   trackStock: true
 *                   stock: 150
 *                   minStock: 20
 *                   maxStock: 200
 *                   featured: true
 *                   categoryId: "clxkz2x1y0000i8uh7b2g5f5e"
 *                   brandId: "clxkz3a1b0002i8uhf4g9h9j9"
 *                   tags: ["smartphone", "samsung", "android", "s24 ultra"]
 *                   seoTitle: "Comprar Samsung Galaxy S24 Ultra | Loja Oficial"
 *                   seoDescription: "Encontre o melhor preço para o novo Samsung Galaxy S24 Ultra. Câmera de 200MP, performance incrível e design premium. Compre já!"
 *                   createdAt: "2024-07-21T10:00:00.000Z"
 *                   updatedAt: "2024-07-22T11:30:00.000Z"
 *       404:
 *         description: Produto não encontrado.
 *       500:
 *         description: Falha ao obter o produto.
 *   put:
 *     summary: Atualiza um produto existente
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do produto a ser atualizado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           examples:
 *             updatePriceAndStock:
 *               summary: Atualiza o preço e o estoque de um produto
 *               value:
 *                 price: 7499.90
 *                 stock: 125
 *                 status: "ACTIVE"
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Produto, categoria ou marca não encontrada.
 *       409:
 *         description: Conflito, SKU ou slug já existe.
 *   delete:
 *     summary: Deleta um produto
 *     tags: [Produtos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID do produto a ser deletado.
 *     responses:
 *       204:
 *         description: Produto deletado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Produto não encontrado.
 */

// Rotas de Produtos
router.post('/products', auth, validate(createProductSchema), productController.createProduct);
router.get('/products', validate(listProductsSchema), productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.put('/products/:id', auth, validate(updateProductSchema), productController.updateProduct);
router.delete('/products/:id', auth, productController.deleteProduct);

module.exports = router;