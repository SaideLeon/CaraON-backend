const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCategory = async (req, res) => {
  try {
    const category = await prisma.category.create({
      data: req.body,
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
    const categories = await prisma.category.findMany({
      where,
      skip: (page - 1) * limit,
      take: +limit,
    });
    const total = await prisma.category.count({ where });
    res.json({ 
      data: categories, 
      pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });
    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(category);
  } catch (error) {
    res.status(404).json({ error: 'Category not found' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await prisma.category.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Category not found' });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
