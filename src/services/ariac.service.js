import 'dotenv/config';

const ARIAC_API_URL = process.env.ARIAC_API_URL;

if (!ARIAC_API_URL) {
  // In a production environment, you might want to handle this more gracefully
  console.error('ARIAC_API_URL is not defined in the environment variables. Service will not work.');
}

/**
 * A helper function to make requests to the Ariac API.
 * @param {string} endpoint - The API endpoint to call.
 * @param {object} options - The options for the fetch request.
 * @returns {Promise<object>} The JSON response from the API.
 */
const fetchAriacAPI = async (endpoint, options = {}) => {
  if (!ARIAC_API_URL) {
    throw new Error('Cannot make API call: ARIAC_API_URL is not configured.');
  }

  const url = `${ARIAC_API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Ariac API request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`API request to ${endpoint} failed with status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error calling Ariac API endpoint ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Sends a message to an agent for processing.
 * @param {object} chatData - The data for the chat request.
 * @returns {Promise<object>} The agent's response.
 */
export const chatWithAgent = async (chatData) => {
  return fetchAriacAPI('/agent/chat', {
    method: 'POST',
    body: JSON.stringify(chatData),
  });
};

/**
 * Updates the hierarchy of agents for a given instance.
 * @param {object} hierarchyData - The data for updating the hierarchy.
 * @returns {Promise<object>} The result of the update operation.
 */
export const updateAgentHierarchy = async (hierarchyData) => {
  return fetchAriacAPI('/agent/hierarchy', {
    method: 'PUT',
    body: JSON.stringify(hierarchyData),
  });
};

/**
 * Retrieves all agent instances associated with a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} A list of agent instances.
 */
export const getUserInstances = async (userId) => {
  return fetchAriacAPI(`/agent/instances/${userId}`, {
    method: 'GET',
  });
};

/**
 * Retrieves all conversation sessions, with optional filters.
 * @param {string} instanceId - The ID of the instance to filter sessions by.
 * @param {string} [whatsappNumber] - Optional. The WhatsApp number (session_id) to filter sessions by.
 * @returns {Promise<object>} A list of conversation sessions.
 */
export const getSessions = async (instanceId, whatsappNumber) => {
  const endpoint = `/agent/sessions?instance_id=${instanceId}${whatsappNumber ? `&whatsapp_number=${whatsappNumber}` : ''}`;
  return fetchAriacAPI(endpoint, {
    method: 'GET',
  });
};

/**
 * Retrieves the full message history for a specific session.
 * @param {string} sessionId - The ID of the session (the user's WhatsApp number).
 * @returns {Promise<object>} The conversation history.
 */
export const getConversation = async (sessionId) => {
  return fetchAriacAPI(`/agent/sessions/${sessionId}/conversation`, {
    method: 'GET',
  });
};
