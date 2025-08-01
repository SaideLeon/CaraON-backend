import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { z } from 'zod';
 
import {  productSchema, ProductListResponseSchema } from '../schemas/product.schema.js';
 

const createProduct = async (req, res) => {
  const { ...productData } = req.body;

  try {
    // Verificar se a categoria existe
    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
    });
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    // Verificar se a marca existe (se fornecida)
    if (productData.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: productData.brandId },
      });
      if (!brand) {
        return res.status(404).json({ error: 'Marca não encontrada.' });
      }
    }

    const product = await prisma.product.create({
      data: productData,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    if (error.code === 'P2002') { // Unique constraint violation
      const fields = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
      return res.status(409).json({ error: `Já existe um produto com este ${fields}.` });
    }
    res.status(500).json({ error: 'Falha ao criar o produto.' });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      categoryId,
      brandId,
      status,
      featured,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const totalProducts = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        category: true,
        brand: true,
      },
    });

    res.status(200).json({
      data: products,
      pagination: {
        total: totalProducts,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalProducts / limitNum),
      },
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Falha ao listar os produtos.' });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
        reviews: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ error: 'Falha ao obter o produto.' });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { ...productData } = req.body;

  try {
    // Verificar se a categoria existe (se fornecida)
    if (productData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
      });
      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada.' });
      }
    }

    // Verificar se a marca existe (se fornecida)
    if (productData.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: productData.brandId },
      });
      if (!brand) {
        return res.status(404).json({ error: 'Marca não encontrada.' });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: productData,
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    if (error.code === 'P2025') { // Record to update not found
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    if (error.code === 'P2002') { // Unique constraint violation
      const fields = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
      return res.status(409).json({ error: `Já existe um produto com este ${fields}.` });
    }
    res.status(500).json({ error: 'Falha ao atualizar o produto.' });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    if (error.code === 'P2025') { // Record to delete not found
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.status(500).json({ error: 'Falha ao deletar o produto.' });
  }
};

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
