const templateService = require('../services/agent.template.service');

exports.createTemplate = async (req, res) => {
  try {
    const template = await templateService.createCustomTemplate({
      ...req.body,
      userId: req.user.userId, // Assumindo que o ID do usuário está no token
    });
    res.status(201).json(template);
  } catch (error) {
    console.error("Erro ao criar template:", error);
    res.status(500).json({ error: 'Falha ao criar o template personalizado.' });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const templates = await templateService.getAvailableTemplates(req.user.userId);
    res.status(200).json(templates);
  } catch (error) {
    console.error("Erro ao listar templates:", error);
    res.status(500).json({ error: 'Falha ao listar os templates.' });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.templateId);
    if (!template || (!template.isSystem && template.userId !== req.user.userId)) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }
    res.status(200).json(template);
  } catch (error) {
    console.error("Erro ao buscar template por ID:", error);
    res.status(500).json({ error: 'Falha ao buscar o template.' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const template = await templateService.updateCustomTemplate(
      req.params.templateId,
      req.body,
      req.user.userId
    );
    res.status(200).json(template);
  } catch (error) {
    console.error("Erro ao atualizar template:", error);
    if (error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Falha ao atualizar o template.' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await templateService.deleteCustomTemplate(req.params.templateId, req.user.userId);
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar template:", error);
    if (error.message.includes('não encontrado') || error.message.includes('em uso')) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Falha ao deletar o template.' });
  }
};
