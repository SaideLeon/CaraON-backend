import * as ariacService from '../services/ariac.service.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const uploadPdf = async (req, res) => {
  try {
    const { userId, instanceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: { organizations: true },
    });

    if (!instance) {
      return res.status(404).json({ message: 'Instance not found.' });
    }

    if (instance.userId !== userId) {
      return res.status(403).json({ message: 'Instance does not belong to the specified user.' });
    }

    if (!instance.organizations || instance.organizations.length === 0) {
      return res.status(404).json({ message: 'No organizations found for this instance.' });
    }

    const organizationId = instance.organizations[0].id;

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
