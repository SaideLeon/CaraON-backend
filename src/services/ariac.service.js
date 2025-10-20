import 'dotenv/config';
import FormData from 'form-data';
import axios from "axios";
import fs from "fs";

const ARIAC_BASE_URL = process.env.ARIAC_API_URL;
const CSRF_TOKEN = "ONDoEfAzbRyOn3u0WTGImU5NfE2un2x0IFHWTl1DPer1yVt6kXGGZEjfqmulgoqX";

if (!ARIAC_BASE_URL) {
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
  if (!ARIAC_BASE_URL) {
    throw new Error('Cannot make API call: ARIAC_API_URL is not configured.');
  }

  const url = `${ARIAC_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRFTOKEN': CSRF_TOKEN,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Ariac API request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`API request to ${endpoint} failed with status ${response.status}: ${errorBody}`);
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
  const url = 'https://agent.cognick.qzz.io/api/chat';
  const payload = {
    user_id: chatData.user_id,
    instance_id: chatData.instance_id,
    session_id: chatData.whatsapp_number,
    username: chatData.username,
    message: chatData.message,
  };
  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRFTOKEN': CSRF_TOKEN,
    },
    body: JSON.stringify(payload),
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Cognick API request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`API request to ${url} failed with status ${response.status}: ${errorBody}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error calling Cognick API:`, error);
    throw error;
  }
};



/**
 * Retrieves all agent instances associated with a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} A list of agent instances.
 */
export const getUserInstances = async (userId) => {
  return fetchAriacAPI(`agent/instances/${userId}`, {
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
  const endpoint = `agent/sessions?instance_id=${instanceId}${whatsappNumber ? `&whatsapp_number=${whatsappNumber}` : ''}`;
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
  return fetchAriacAPI(`agent/sessions/${sessionId}/conversation`, {
    method: 'GET',
  });
};

/**
 * Uploads a PDF file to the Ariac knowledge base.
 * @param {string} userId - The ID of the user.
 * @param {string} organizationId - The ID of the organization.
 * @param {string} pdfPath - The path to the PDF file.
 * @returns {Promise<object>} The result of the upload operation.
 */
export async function uploadPdfToKnowledgeBase(userId, instanceId, pdfPath) {
  const url = `${ARIAC_BASE_URL}/knowledge/upload-pdf/${userId}/${instanceId}`;

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(pdfPath), {
      filename: pdfPath.split("/").pop(),
      contentType: "application/pdf",
    });

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar PDF para Ariac:", error.response?.data || error.message);
    throw error;
  }
}