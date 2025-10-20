import * as ariacService from '../services/ariac.service.js';

/**
 * @summary Get all agent instances for the authenticated user.
 * @description Retrieves a list of all agent instances associated with the user ID from the authenticated session.
 */
const getUserInstancesController = async (req, res) => {
  try {
    const { userId } = req.user; // Extracted from auth middleware

    const result = await ariacService.getUserInstances(userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to get user instances:', error);
    res.status(500).json({ message: 'An error occurred while fetching user instances.', error: error.message });
  }
};

const getSessionsController = async (req, res) => {
  try {
    const { instance_id, whatsapp_number } = req.validatedData.query;
    const result = await ariacService.getSessions(instance_id, whatsapp_number);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({ message: 'An error occurred while fetching sessions.', error: error.message });
  }
};

const getConversationController = async (req, res) => {
  try {
    const { session_id } = req.validatedData.params;
    const result = await ariacService.getConversation(session_id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to get conversation:', error);
    res.status(500).json({ message: 'An error occurred while fetching the conversation.', error: error.message });
  }
};

const uploadKnowledgePdf = async (req, res) => {
  try {
    const { user_id, instance_id } = req.params;
    const { userId: authenticatedUserId } = req.user;
    const file = req.file;

    if (user_id !== authenticatedUserId) {
      return res.status(403).json({ message: 'User ID in URL does not match authenticated user.' });
    }

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const instance = await prisma.instance.findUnique({
      where: { id: instance_id },
      include: { organizations: true },
    });

    if (!instance) {
      return res.status(404).json({ message: 'Instance not found.' });
    }

    if (instance.userId !== authenticatedUserId) {
      return res.status(403).json({ message: 'Instance does not belong to the authenticated user.' });
    }

    if (!instance.organizations || instance.organizations.length === 0) {
      return res.status(404).json({ message: 'No organizations found for this instance.' });
    }

    const organizationId = instance.organizations[0].id;

    const result = await ariacService.uploadPdfToKnowledgeBase(user_id, organizationId, file);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to upload PDF to knowledge base:', error);
    res.status(500).json({ message: 'An error occurred while uploading the PDF.', error: error.message });
  }
};

export default {
  getUserInstancesController,
  getSessionsController,
  getConversationController,
  uploadKnowledgePdf,
};
