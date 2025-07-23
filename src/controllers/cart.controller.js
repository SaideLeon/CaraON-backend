const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

const CartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    price: z.number(),
    stock: z.number(),
    images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  }).optional(),
});

const CartItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
}); 

// Função auxiliar para calcular os totais do carrinho
const calculateCartTotals = (cartItems) => {
  if (!cartItems || cartItems.length === 0) {
    return {
      subtotal: 0,
      total: 0,
      totalItems: 0,
    };
  }

  const subtotal = cartItems.reduce((acc, item) => {
    // Garante que o produto e o preço existem
    if (item.product && typeof item.product.price === 'number') {
      return acc + item.quantity * item.product.price;
    }
    return acc;
  }, 0);

  // Lógica de descontos, frete, etc. pode ser adicionada aqui
  const total = subtotal;
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    subtotal,
    total,
    totalItems,
  };
};

exports.getCart = async (req, res) => {
  const { userId } = req.user;

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            images: {
              take: 1,
              select: { url: true, alt: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const totals = calculateCartTotals(cartItems);

    res.status(200).json({
      items: cartItems,
      ...totals,
    });
  } catch (error) {
    console.error('Erro ao obter carrinho:', error);
    res.status(500).json({ error: 'Falha ao obter o carrinho.' });
  }
};

exports.addToCart = async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity } = req.body;

  try {
    // 1. Verificar se o produto existe e tem estoque
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (product.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Este produto não está disponível para compra.' });
    }

    if (!product.trackStock || product.stock < quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente.' });
    }

    // 2. Verificar se o item já existe no carrinho do usuário
    const existingCartItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    let cartItem;
    if (existingCartItem) {
      // Se existe, atualiza a quantidade
      const newQuantity = existingCartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: 'Estoque insuficiente para a quantidade total.' });
      }
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Se não existe, cria um novo item no carrinho
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
          price: product.price, // Armazena o preço no momento da adição
        },
      });
    }

    // Popula o campo 'product' no retorno
    const cartItemWithProduct = {
      ...cartItem,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        images: product.images ? product.images.map(img => ({ url: img.url, alt: img.alt })) : []
      }
    };
    res.status(201).json(cartItemWithProduct);
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    res.status(500).json({ error: 'Falha ao adicionar o item ao carrinho.' });
  }
};

exports.updateCart = async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity } = req.body;

  try {
    const existingCartItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
      include: { product: true },
    });

    if (!existingCartItem) {
      return res.status(404).json({ error: 'Item não encontrado no carrinho.' });
    }

    if (quantity === 0) {
      // Se a quantidade for 0, remove o item
      await prisma.cartItem.delete({ where: { id: existingCartItem.id } });
      return res.status(204).send();
    }

    // Verifica o estoque
    if (existingCartItem.product.stock < quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente.' });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity },
    });

    // Popula o campo 'product' no retorno
    const product = existingCartItem.product;
    const updatedItemWithProduct = {
      ...updatedItem,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        images: product.images ? product.images.map(img => ({ url: img.url, alt: img.alt })) : []
      } : undefined
    };
    res.status(200).json(updatedItemWithProduct);
  } catch (error) {
    console.error('Erro ao atualizar o carrinho:', error);
    res.status(500).json({ error: 'Falha ao atualizar o item no carrinho.' });
  }
};

exports.removeFromCart = async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.body;

  try {
    const existingCartItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    if (!existingCartItem) {
      return res.status(404).json({ error: 'Item não encontrado no carrinho.' });
    }

    await prisma.cartItem.delete({ where: { id: existingCartItem.id } });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover do carrinho:', error);
    res.status(500).json({ error: 'Falha ao remover o item do carrinho.' });
  }
};