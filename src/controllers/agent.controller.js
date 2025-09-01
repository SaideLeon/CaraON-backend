import * as ariacService from '../services/ariac.service.js';

/**
 * @summary Update the agent hierarchy for a specific instance.
 * @description This endpoint receives the agent hierarchy configuration and passes it to the Ariac service.
 * The user ID is extracted from the authenticated user's session.
 */
const updateHierarchy = async (req, res) => {
  try {
    const { instance_id, router_instructions, agents } = req.validatedData.body;
    const { userId } = req.user; // Extracted from auth middleware

    const hierarchyData = {
      user_id: userId,
      instance_id,
      router_instructions,
      agents,
    };

    const result = await ariacService.updateAgentHierarchy(hierarchyData);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to update agent hierarchy:', error);
    res.status(500).json({ message: 'An error occurred while updating the hierarchy.', error: error.message });
  }
};

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
  updateHierarchy,
  getUserInstancesController,
  getSessionsController,
  getConversationController,
  uploadKnowledgePdf,
};
