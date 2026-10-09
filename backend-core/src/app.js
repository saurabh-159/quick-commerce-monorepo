const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { clientOrigin } = require('./config/env');
const apiRoutes = require('./routes/index');
const { notFound, errorHandler } = require('./middleware/error');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/ai', aiRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;