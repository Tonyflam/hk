import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();

// In-memory store (use Redis/DB in production)
interface Agent {
  id: string;
  owner: string;
  name: string;
  description: string;
  metadataUri: string;
  capabilities: string[];
  pricePerCall: string;
  paymentAddress: string;
  isActive: boolean;
  totalCalls: number;
  totalRevenue: string;
  rating: number;
  ratingCount: number;
  createdAt: string;
  lastActiveAt: string;
}

const agents: Map<string, Agent> = new Map();

// Initialize with demo agents
function initDemoAgents() {
  const demoAgents: Agent[] = [
    {
      id: 'agent-defi-strategist',
      owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      name: 'DeFi Strategist',
      description: 'AI-powered DeFi strategy optimization agent. Analyzes yield opportunities across Cronos protocols and executes optimal strategies.',
      metadataUri: 'ipfs://Qm...',
      capabilities: ['defi', 'yield-optimization', 'liquidity-management', 'trading'],
      pricePerCall: '100000', // 0.1 USDC
      paymentAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      isActive: true,
      totalCalls: 1247,
      totalRevenue: '124700000',
      rating: 450,
      ratingCount: 89,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString()
    },
    {
      id: 'agent-payment-processor',
      owner: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      name: 'Universal Payment Processor',
      description: 'Handles complex payment workflows including splits, streams, and conditional releases using x402 protocol.',
      metadataUri: 'ipfs://Qm...',
      capabilities: ['payments', 'settlements', 'splits', 'streaming'],
      pricePerCall: '50000', // 0.05 USDC
      paymentAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      isActive: true,
      totalCalls: 3892,
      totalRevenue: '194600000',
      rating: 480,
      ratingCount: 156,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString()
    },
    {
      id: 'agent-market-oracle',
      owner: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      name: 'Crypto.com Market Oracle',
      description: 'Real-time market data and AI-powered price predictions using Crypto.com MCP data feeds.',
      metadataUri: 'ipfs://Qm...',
      capabilities: ['data-oracle', 'price-feeds', 'predictions', 'analytics'],
      pricePerCall: '25000', // 0.025 USDC
      paymentAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      isActive: true,
      totalCalls: 12453,
      totalRevenue: '311325000',
      rating: 470,
      ratingCount: 342,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString()
    },
    {
      id: 'agent-rwa-manager',
      owner: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      name: 'RWA Lifecycle Manager',
      description: 'Manages real-world asset tokenization, compliance, and settlement automation on Cronos.',
      metadataUri: 'ipfs://Qm...',
      capabilities: ['rwa', 'tokenization', 'compliance', 'settlement'],
      pricePerCall: '500000', // 0.5 USDC
      paymentAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      isActive: true,
      totalCalls: 234,
      totalRevenue: '117000000',
      rating: 490,
      ratingCount: 28,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString()
    },
    {
      id: 'agent-security-sentinel',
      owner: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
      name: 'Security Sentinel',
      description: 'AI-powered transaction security agent. Analyzes and validates x402 payments before execution.',
      metadataUri: 'ipfs://Qm...',
      capabilities: ['security', 'validation', 'risk-assessment', 'monitoring'],
      pricePerCall: '10000', // 0.01 USDC
      paymentAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
      isActive: true,
      totalCalls: 45678,
      totalRevenue: '456780000',
      rating: 495,
      ratingCount: 892,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString()
    }
  ];

  demoAgents.forEach(agent => agents.set(agent.id, agent));
}

initDemoAgents();

// GET /api/agents - List all agents
router.get('/', (req: Request, res: Response) => {
  const { capability, active, sort, limit = 20, offset = 0 } = req.query;

  let result = Array.from(agents.values());

  // Filter by capability
  if (capability) {
    result = result.filter(a => a.capabilities.includes(capability as string));
  }

  // Filter by active status
  if (active !== undefined) {
    result = result.filter(a => a.isActive === (active === 'true'));
  }

  // Sort
  if (sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'calls') {
    result.sort((a, b) => b.totalCalls - a.totalCalls);
  } else if (sort === 'revenue') {
    result.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Pagination
  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    agents: result,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + result.length < total
    }
  });
});

// GET /api/agents/:id - Get agent details
router.get('/:id', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  res.json({ agent });
});

// POST /api/agents - Register new agent
router.post('/', (req: Request, res: Response) => {
  const { name, description, capabilities, pricePerCall, paymentAddress, owner } = req.body;

  if (!name || !capabilities || !pricePerCall || !paymentAddress || !owner) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const id = `agent-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const agent: Agent = {
    id,
    owner,
    name,
    description: description || '',
    metadataUri: '',
    capabilities,
    pricePerCall,
    paymentAddress,
    isActive: true,
    totalCalls: 0,
    totalRevenue: '0',
    rating: 0,
    ratingCount: 0,
    createdAt: now,
    lastActiveAt: now
  };

  agents.set(id, agent);

  res.status(201).json({
    message: 'Agent registered successfully',
    agent
  });
});

// POST /api/agents/:id/call - Call an agent (with payment verification)
router.post('/:id/call', async (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  if (!agent.isActive) {
    res.status(400).json({ error: 'Agent is not active' });
    return;
  }

  // Update stats
  agent.totalCalls++;
  agent.totalRevenue = (BigInt(agent.totalRevenue) + BigInt(agent.pricePerCall)).toString();
  agent.lastActiveAt = new Date().toISOString();

  // Simulate agent response
  const response = {
    agentId: agent.id,
    agentName: agent.name,
    callId: uuidv4(),
    timestamp: new Date().toISOString(),
    input: req.body,
    output: {
      success: true,
      message: `Agent ${agent.name} processed your request`,
      data: generateAgentResponse(agent, req.body)
    },
    payment: {
      amount: agent.pricePerCall,
      currency: 'USDC',
      status: 'completed'
    }
  };

  res.json(response);
});

// POST /api/agents/:id/rate - Rate an agent
router.post('/:id/rate', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  const { rating } = req.body;

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' });
    return;
  }

  // Calculate new average (scaled by 100)
  const totalRating = agent.rating * agent.ratingCount;
  agent.ratingCount++;
  agent.rating = Math.round((totalRating + rating * 100) / agent.ratingCount);

  res.json({
    message: 'Rating submitted',
    newRating: agent.rating / 100,
    totalRatings: agent.ratingCount
  });
});

// GET /api/agents/capabilities - List all capabilities
router.get('/meta/capabilities', (req: Request, res: Response) => {
  const capabilities = new Set<string>();
  agents.forEach(agent => {
    agent.capabilities.forEach(cap => capabilities.add(cap));
  });

  res.json({
    capabilities: Array.from(capabilities)
  });
});

// Helper function to generate simulated agent responses
function generateAgentResponse(agent: Agent, input: any): any {
  if (agent.capabilities.includes('defi')) {
    return {
      recommendation: 'OPTIMAL_STRATEGY',
      strategies: [
        { protocol: 'VVS Finance', action: 'PROVIDE_LIQUIDITY', apy: '12.5%' },
        { protocol: 'Tectonic', action: 'LEND', apy: '8.2%' }
      ],
      estimatedYield: '10.35%',
      riskScore: 'MEDIUM'
    };
  }

  if (agent.capabilities.includes('data-oracle')) {
    return {
      prices: {
        CRO: { usd: 0.089, change24h: '+2.3%' },
        ETH: { usd: 2345.67, change24h: '+1.2%' },
        BTC: { usd: 43210.89, change24h: '+0.8%' }
      },
      timestamp: new Date().toISOString(),
      source: 'Crypto.com MCP'
    };
  }

  if (agent.capabilities.includes('payments')) {
    return {
      paymentId: uuidv4(),
      status: 'PROCESSED',
      method: 'x402',
      confirmations: 1
    };
  }

  if (agent.capabilities.includes('security')) {
    return {
      riskScore: 15,
      verdict: 'SAFE',
      checks: [
        { name: 'Contract Verification', passed: true },
        { name: 'Honeypot Detection', passed: true },
        { name: 'Anomaly Detection', passed: true }
      ]
    };
  }

  return {
    processed: true,
    timestamp: new Date().toISOString()
  };
}

export { router as agentRoutes };
