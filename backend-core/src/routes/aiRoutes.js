const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Consumer AI Routes
router.post('/search', aiController.searchProducts);
router.post('/recommendations', aiController.getRecommendations);
router.post('/assistant', aiController.handleAssistantChat);
router.post('/chat-memory', aiController.handleMemoryChat);
router.post('/parse-query', aiController.parseQuery);
router.post('/tool-chat', aiController.handleToolChat);
router.post('/langchain-suggest', aiController.getLangChainSuggestion);
router.post('/agent-support', aiController.handleAgentSupport);
router.post('/order-support', aiController.handleOrderSupport);

// Admin AI Routes
router.post('/admin/generate-content', aiController.generateAdminContent);

module.exports = router;