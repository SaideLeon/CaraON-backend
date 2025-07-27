const { defineTool } = require('@genkit-ai/flow');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * @description Tool para buscar produtos no banco de dados.
 * O LLM pode usar esta ferramenta para encontrar produtos com base em uma consulta de texto.
 */
const searchProductsTool = defineTool(
  {
    name: 'searchProducts',
    description: 'Busca por produtos no catálogo da loja. Use para encontrar informações sobre produtos, verificar preços e estoque.',
    inputSchema: z.object({
      query: z.string().describe('O nome, categoria ou palavras-chave do produto a ser pesquisado.'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        price: z.number(),
        stock: z.number(),
        category: z.string(),
      })
    ),
  },
  async (input) => {
    console.log(`[Tool] Executando busca de produtos com a query: ${input.query}`);
    try {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
            { tags: { has: input.query.toLowerCase() } },
            { category: { name: { contains: input.query, mode: 'insensitive' } } },
          ],
          status: 'ACTIVE', // Apenas produtos ativos
        },
        include: {
          category: true, // Inclui a categoria para obter o nome
        },
        take: 5, // Limita a 5 resultados para não sobrecarregar o LLM
      });

      if (products.length === 0) {
        return [{ message: 'Nenhum produto encontrado com esse critério.' }];
      }

      // Formata a saída para o LLM
      return products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        category: p.category.name,
      }));

    } catch (error) {
      console.error('[Tool Error] Falha ao buscar produtos:', error);
      // Retorna uma mensagem de erro que o LLM pode entender e repassar ao usuário
      return [{ message: 'Ocorreu um erro ao tentar buscar os produtos. Por favor, tente novamente.' }];
    }
  }
);

/**
 * @description Tool para buscar informações do cliente (usuário) logado.
 * O LLM pode usar esta ferramenta para personalizar a conversa.
 */
const getCustomerInfoTool = defineTool(
  {
    name: 'getCustomerInfo',
    description: 'Obtém informações detalhadas sobre o cliente logado, como nome, email, histórico de pedidos e endereço padrão.',
    inputSchema: z.object({
      userId: z.string().describe('O ID do usuário logado para buscar as informações.'),
    }),
    outputSchema: z.object({
        name: z.string(),
        email: z.string(),
        memberSince: z.date(),
        totalOrders: z.number(),
        defaultAddress: z.string().nullable(),
        lastOrder: z.object({
            orderNumber: z.string(),
            status: z.string(),
            total: z.number(),
        }).nullable(),
    }),
  },
  async (input) => {
    console.log(`[Tool] Buscando informações para o usuário: ${input.userId}`);
    try {
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            include: {
                customer: true,
                addresses: {
                    where: { isDefault: true },
                },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user) {
            return { message: `Usuário com ID ${input.userId} não encontrado.`};
        }

        const customerInfo = user.customer || {};
        const defaultAddress = user.addresses[0];
        const lastOrder = user.orders[0];

        return {
            name: user.name,
            email: user.email,
            memberSince: customerInfo.customerSince || user.createdAt,
            totalOrders: customerInfo.totalOrders || 0,
            defaultAddress: defaultAddress 
                ? `${defaultAddress.street}, ${defaultAddress.number}, ${defaultAddress.city} - ${defaultAddress.state}`
                : 'Nenhum endereço padrão cadastrado.',
            lastOrder: lastOrder 
                ? { orderNumber: lastOrder.orderNumber, status: lastOrder.status, total: lastOrder.total }
                : null,
        };

    } catch (error) {
        console.error('[Tool Error] Falha ao buscar informações do cliente:', error);
        return { message: 'Ocorreu um erro ao buscar as informações do cliente.' };
    }
  }
);


// Exporta um mapa com todas as ferramentas definidas
const toolRegistry = {
  [searchProductsTool.name]: searchProductsTool,
  [getCustomerInfoTool.name]: getCustomerInfoTool,
};

module.exports = {
  toolRegistry,
  // Exporta as ferramentas individualmente se necessário
  searchProductsTool,
  getCustomerInfoTool,
};
