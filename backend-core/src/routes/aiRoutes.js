const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, allowRoles } = require('../middleware/auth');

// Public
router.post('/search', aiController.searchProducts);
router.post('/recommendations', aiController.getRecommendations);
router.post('/assistant', aiController.handleAssistantChat);
router.post('/parse-query', aiController.parseQuery);
router.post('/tool-chat', aiController.handleToolChat);
router.post('/langchain-suggest', aiController.getLangChainSuggestion);
router.post('/agent-support', aiController.handleAgentSupport);
// Login required
router.post('/chat-memory', protect, aiController.handleMemoryChat);
router.post('/order-support', protect, aiController.handleOrderSupport);

// Admin AI Routes
// Admin only
router.post(
    '/admin/generate-content',
    protect,
    allowRoles('admin'),
    aiController.generateAdminContent
  );

module.exports = router;