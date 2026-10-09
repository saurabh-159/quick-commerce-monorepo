const aiService = require('../services/aiService');

const aiController = {
  // 1. Semantic Product Search
  async searchProducts(req, res) {
    try {
      const { query, limit } = req.body;
      if (!query) return res.status(400).json({ error: 'Query is required' });
      
      const result = await aiService.searchProducts(query, limit);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 2. AI Product Recommendations
  async getRecommendations(req, res) {
    try {
      const { product_id, limit } = req.body;
      if (!product_id) return res.status(400).json({ error: 'product_id is required' });

      const result = await aiService.getRecommendations(product_id, limit);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 3. RAG Shopping Assistant
  async handleAssistantChat(req, res) {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: 'Query is required' });

      const result = await aiService.getAssistantResponse(query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 4. Conversation History / Memory Chat
  async handleMemoryChat(req, res) {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const result = await aiService.getMemoryChat(messages);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 5. Natural Language Query Parser (Filters)
  async parseQuery(req, res) {
    try {
      const { user_query } = req.body;
      if (!user_query) return res.status(400).json({ error: 'user_query is required' });

      const result = await aiService.parseQueryFilters(user_query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 6. Tool-Assisted Chat (Stock Check)
  async handleToolChat(req, res) {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const result = await aiService.getToolAssistedChat(message);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 7. LangChain Suggestion
  async getLangChainSuggestion(req, res) {
    try {
      const { category, item } = req.body;
      if (!category || !item) {
        return res.status(400).json({ error: 'Category and item are required' });
      }

      const result = await aiService.getLangChainSuggestion(category, item);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 8. LangGraph Support Agent
  async handleAgentSupport(req, res) {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: 'Query is required' });

      const result = await aiService.getAgentSupport(query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 9. Admin AI Content Generation
  async generateAdminContent(req, res) {
    try {
      const { product_name, category } = req.body;
      if (!product_name || !category) {
        return res.status(400).json({ error: 'product_name and category are required' });
      }

      const result = await aiService.generateAdminContent(product_name, category);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // 10. Order Support AI (RAG + Auth Status)
  async handleOrderSupport(req, res) {
    try {
      // User authentication middleware se req.user._id mil jayega, warna fallback
      const userId = req.user ? req.user._id : (req.body.user_id || 'user_123'); 
      const { query } = req.body;

      if (!query) return res.status(400).json({ error: 'Query is required' });

      const result = await aiService.getOrderSupport(userId, query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = aiController;