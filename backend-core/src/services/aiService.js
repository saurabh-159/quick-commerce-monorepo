const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_HEADERS = {
  'X-AI-API-Key': process.env.AI_API_KEY || '',
};

const aiService = {
  // 1. Semantic Product Search
  async searchProducts(query, limit = 5) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/search`,
        { query, limit },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Search):', error.message);
      throw new Error('AI Search service is currently unavailable.');
    }
  },

  // 2. AI Product Recommendations
  async getRecommendations(productId, limit = 3) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/recommend`,
        { product_id: productId, limit },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Recommendations):', error.message);
      throw new Error('AI Recommendation service is currently unavailable.');
    }
  },

  // 3. RAG Shopping Assistant
  async getAssistantResponse(query, lat, lng) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/assistant`,
        { query, lat, lng },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Assistant):', error.message);
      throw new Error('AI Assistant is currently unavailable.');
    }
  },

  // 4. Conversation History / Memory Chat
  async getMemoryChat(messages) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/chat-memory`,
        { messages },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Memory Chat):', error.message);
      throw new Error('AI Chat service is currently unavailable.');
    }
  },

  // 5. Natural Language Query Parser (Filters)
  async parseQueryFilters(userQuery) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/parse-query`,
        { user_query: userQuery },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️️ AI Service Error (Parser):', error.message);
      throw new Error('AI Parser service is currently unavailable.');
    }
  },

  // 6. Tool-Assisted Chat (Stock Check etc.)
  async getToolAssistedChat(message) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/tool-chat`,
        { message },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Tool Chat):', error.message);
      throw new Error('AI Tool service is currently unavailable.');
    }
  },

  // 7. LangChain Suggestion
  async getLangChainSuggestion(category, item) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/langchain-suggest`,
        { category, item },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (LangChain):', error.message);
      throw new Error('AI LangChain service is currently unavailable.');
    }
  },

  // 8. LangGraph Support Agent
  async getAgentSupport(query) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/agent-support`,
        { query },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Agent):', error.message);
      throw new Error('AI Agent is currently unavailable.');
    }
  },

  // 9. Admin AI Content Generation
  async generateAdminContent(productName, category) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/admin/generate-product-content`,
        {
          product_name: productName,
          category,
        },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Admin AI):', error.message);
      throw new Error('Admin AI service is currently unavailable.');
    }
  },

  // 10. Order Support AI (RAG + Auth Status)
  async getOrderSupport(userId, query) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/support/query`,
        {
          user_id: userId,
          query: query,
        },
        { headers: AI_HEADERS }
      );
      return response.data;
    } catch (error) {
      console.error('⚠️ AI Service Error (Support):', error.message);
      throw new Error('AI Support is currently unavailable.');
    }
  },
};

module.exports = aiService;
