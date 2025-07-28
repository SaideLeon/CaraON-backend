import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export function defineTools(ai) {
  const searchProductsTool = ai.defineTool(
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
            status: 'ACTIVE',
          },
          include: {
            category: true,
          },
          take: 5,
        });

        if (products.length === 0) {
          return [{ message: 'Nenhum produto encontrado com esse critério.' }];
        }

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
        return [{ message: 'Ocorreu um erro ao tentar buscar os produtos. Por favor, tente novamente.' }];
      }
    }
  );

  const toolRegistry = {
    [searchProductsTool.name]: searchProductsTool,
  };

  return { searchProductsTool, toolRegistry };
}