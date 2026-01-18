import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { agentRoutes } from './routes/agents.js';
import { workflowRoutes } from './routes/workflows.js';
import { paymentRoutes } from './routes/payments.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { analyticsRoutes } from './routes/analytics.js';
import { x402Middleware } from './middleware/x402.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    name: 'NEXUS-402 API'
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'NEXUS-402 API',
    version: '1.0.0',
    description: 'Universal x402 Orchestration Protocol & Agent Marketplace',
    endpoints: {
      agents: '/api/agents',
      workflows: '/api/workflows',
      payments: '/api/payments',
      marketplace: '/api/marketplace',
      analytics: '/api/analytics'
    },
    x402: {
      facilitator: process.env.FACILITATOR_URL,
      network: 'Cronos Testnet (338)',
      paymentToken: 'USDC.e'
    }
  });
});

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/analytics', analyticsRoutes);

// x402 Protected routes (require payment)
app.use('/api/premium', x402Middleware, (req, res) => {
  res.json({
    message: 'Welcome to premium features!',
    paymentVerified: true
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 NEXUS-402 API Server                                 ║
  ║                                                           ║
  ║   Universal x402 Orchestration Protocol                   ║
  ║   & Agent Marketplace for Cronos                          ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║   🌐 Server:     http://localhost:${PORT}                   ║
  ║   📡 API:        http://localhost:${PORT}/api               ║
  ║   ❤️  Health:     http://localhost:${PORT}/health            ║
  ║                                                           ║
  ║   📚 Endpoints:                                           ║
  ║      • /api/agents      - Agent Registry                  ║
  ║      • /api/workflows   - Workflow Engine                 ║
  ║      • /api/payments    - Payment Router                  ║
  ║      • /api/marketplace - Agent Marketplace               ║
  ║      • /api/analytics   - Protocol Analytics              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
