import * as toolsService from '../services/tools.service.js';

const createTool = async (req, res) => {
  try {
    const tool = await toolsService.createCustomTool(req.body);
    res.status(201).json(tool);
  } catch (error) {
    console.error('Erro ao criar ferramenta:', error);
    res.status(500).json({ error: 'Falha ao criar a ferramenta personalizada.' });
  }
};

const getTools = async (req, res) => {
  try {
    const tools = await toolsService.getAllTools();
    res.status(200).json(tools);
  } catch (error) {
    console.error('Erro ao listar ferramentas:', error);
    res.status(500).json({ error: 'Falha ao listar as ferramentas.' });
  }
};

const getToolById = async (req, res) => {
  try {
    const tool = await toolsService.getToolById(req.params.toolId);
    if (!tool) {
      return res.status(404).json({ error: 'Ferramenta não encontrada.' });
    }
    res.status(200).json(tool);
  } catch (error) {
    console.error('Erro ao buscar ferramenta por ID:', error);
    res.status(500).json({ error: 'Falha ao buscar a ferramenta.' });
  }
};

export default {
  createTool,
  getTools,
  getToolById,
};