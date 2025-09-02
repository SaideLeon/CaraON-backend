import * as ariacService from '../services/ariac.service.js';

const uploadPdf = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { userId } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const result = await ariacService.uploadPdfToKnowledgeBase(userId, organizationId, file);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to upload PDF to knowledge base:', error);
    res.status(500).json({ message: 'An error occurred while uploading the PDF.', error: error.message });
  }
};

export default {
  uploadPdf,
};
