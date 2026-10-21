const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');
const { homeQuerySchema } = require('../validators/home.validator');

router.get(
  '/',
  rateLimit({ windowMs: 60 * 1000, max: 80 }),
  validate(homeQuerySchema, 'query'),
  homeController.getHome
);

module.exports = router;
