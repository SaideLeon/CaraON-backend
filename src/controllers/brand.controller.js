const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createBrand = async (req, res) => {
  try {
    const brand = await prisma.brand.create({
      data: req.body,
    });
    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getBrands = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
    const brands = await prisma.brand.findMany({
      where,
      skip: (page - 1) * limit,
      take: +limit,
    });
    const total = await prisma.brand.count({ where });
    res.json({ 
      data: brands, 
      pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

const getBrandById = async (req, res) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
    });
    if (brand) {
      res.json(brand);
    } else {
      res.status(404).json({ error: 'Brand not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
};

const updateBrand = async (req, res) => {
  try {
    const brand = await prisma.brand.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(brand);
  } catch (error) {
    res.status(404).json({ error: 'Brand not found' });
  }
};

const deleteBrand = async (req, res) => {
  try {
    await prisma.brand.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Brand not found' });
  }
};

module.exports = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
