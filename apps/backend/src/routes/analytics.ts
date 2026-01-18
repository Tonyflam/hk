import { Router, Request, Response } from 'express';

const router: Router = Router();

// Simulated historical data generator
function generateTimeSeriesData(days: number, baseValue: number, volatility: number) {
  const data = [];
  let value = baseValue;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    value = value * (1 + (Math.random() - 0.5) * volatility);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100
    });
  }
  
  return data;
}

// GET /api/analytics/overview - Protocol overview
router.get('/overview', (req: Request, res: Response) => {
  const overview = {
    protocol: {
      name: 'NEXUS-402',
      version: '1.0.0',
      network: 'Cronos Testnet',
      chainId: 338
    },
    stats: {
      totalAgents: 47,
      activeAgents: 42,
      totalWorkflows: 156,
      activeWorkflows: 134,
      totalPayments: 12847,
      totalVolume: '4,823,456.78',
      totalVolumeUSD: 4823456.78,
      avgTransactionValue: '375.32',
      successRate: 97.2
    },
    growth: {
      agents24h: '+3',
      workflows24h: '+8',
      payments24h: '+234',
      volume24h: '+45,678.90'
    },
    timestamp: new Date().toISOString()
  };

  res.json(overview);
});

// GET /api/analytics/agents - Agent analytics
router.get('/agents', (req: Request, res: Response) => {
  const agentAnalytics = {
    summary: {
      totalAgents: 47,
      activeAgents: 42,
      inactiveAgents: 5,
      avgRating: 4.65,
      totalCalls: 89234,
      totalRevenue: '2,345,678.90'
    },
    topAgents: [
      {
        id: 'agent-security-sentinel',
        name: 'Security Sentinel',
        calls: 45678,
        revenue: '456,780.00',
        rating: 4.95,
        category: 'security'
      },
      {
        id: 'agent-market-oracle',
        name: 'Crypto.com Market Oracle',
        calls: 12453,
        revenue: '311,325.00',
        rating: 4.70,
        category: 'data-oracle'
      },
      {
        id: 'agent-payment-processor',
        name: 'Universal Payment Processor',
        calls: 3892,
        revenue: '194,600.00',
        rating: 4.80,
        category: 'payments'
      },
      {
        id: 'agent-defi-strategist',
        name: 'DeFi Strategist',
        calls: 1247,
        revenue: '124,700.00',
        rating: 4.50,
        category: 'defi'
      },
      {
        id: 'agent-rwa-manager',
        name: 'RWA Lifecycle Manager',
        calls: 234,
        revenue: '117,000.00',
        rating: 4.90,
        category: 'rwa'
      }
    ],
    byCategory: [
      { category: 'security', count: 12, calls: 52341 },
      { category: 'payments', count: 10, calls: 18923 },
      { category: 'defi', count: 8, calls: 8234 },
      { category: 'data-oracle', count: 7, calls: 15678 },
      { category: 'analytics', count: 5, calls: 3456 },
      { category: 'trading', count: 3, calls: 2341 },
      { category: 'rwa', count: 2, calls: 567 }
    ],
    callsOverTime: generateTimeSeriesData(30, 2500, 0.15)
  };

  res.json(agentAnalytics);
});

// GET /api/analytics/workflows - Workflow analytics
router.get('/workflows', (req: Request, res: Response) => {
  const workflowAnalytics = {
    summary: {
      totalWorkflows: 156,
      activeWorkflows: 134,
      totalExecutions: 8923,
      successfulExecutions: 8567,
      failedExecutions: 356,
      successRate: 96.01,
      avgExecutionTime: '3.2s',
      avgStepsPerWorkflow: 4.7
    },
    topWorkflows: [
      {
        id: 'workflow-payment-split',
        name: 'Revenue Split Automation',
        executions: 892,
        successRate: 99.7,
        avgTime: '1.8s'
      },
      {
        id: 'workflow-defi-harvest',
        name: 'DeFi Yield Harvester',
        executions: 156,
        successRate: 95.5,
        avgTime: '4.2s'
      },
      {
        id: 'workflow-rwa-settlement',
        name: 'RWA Settlement Pipeline',
        executions: 34,
        successRate: 94.1,
        avgTime: '6.8s'
      }
    ],
    byStepCount: [
      { steps: '1-2', count: 45 },
      { steps: '3-4', count: 67 },
      { steps: '5-6', count: 32 },
      { steps: '7+', count: 12 }
    ],
    executionsOverTime: generateTimeSeriesData(30, 250, 0.2)
  };

  res.json(workflowAnalytics);
});

// GET /api/analytics/payments - Payment analytics
router.get('/payments', (req: Request, res: Response) => {
  const paymentAnalytics = {
    summary: {
      totalPayments: 12847,
      totalVolume: '4,823,456.78',
      avgPaymentSize: '375.32',
      pendingAmount: '45,678.90',
      streamingActive: 23,
      recurringActive: 156
    },
    byType: [
      { type: 'SIMPLE', count: 8923, volume: '2,345,678.90' },
      { type: 'SPLIT', count: 2341, volume: '1,234,567.89' },
      { type: 'STREAMING', count: 456, volume: '567,890.12' },
      { type: 'RECURRING', count: 789, volume: '456,789.01' },
      { type: 'CONDITIONAL', count: 338, volume: '218,530.86' }
    ],
    x402Stats: {
      totalX402Payments: 8234,
      avgProcessingTime: '1.2s',
      successRate: 98.7,
      avgGasCost: '0.0023 CRO'
    },
    volumeOverTime: generateTimeSeriesData(30, 150000, 0.25),
    transactionsOverTime: generateTimeSeriesData(30, 400, 0.2)
  };

  res.json(paymentAnalytics);
});

// GET /api/analytics/marketplace - Marketplace analytics
router.get('/marketplace', (req: Request, res: Response) => {
  const marketplaceAnalytics = {
    summary: {
      totalListings: 89,
      activeListings: 78,
      totalOrders: 3456,
      completedOrders: 3234,
      totalRevenue: '1,234,567.89',
      avgOrderValue: '357.23'
    },
    topSellers: [
      {
        address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        name: 'Security Sentinel Provider',
        sales: 8923,
        revenue: '892,300.00',
        rating: 4.95
      },
      {
        address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        name: 'Market Oracle Provider',
        sales: 1892,
        revenue: '473,000.00',
        rating: 4.75
      },
      {
        address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
        name: 'RWA Solutions',
        sales: 45,
        revenue: '225,000.00',
        rating: 4.90
      }
    ],
    byCategory: [
      { category: 'security', listings: 23, orders: 9234 },
      { category: 'analytics', listings: 18, orders: 2345 },
      { category: 'payments', listings: 15, orders: 1567 },
      { category: 'defi', listings: 12, orders: 892 },
      { category: 'data-oracle', listings: 10, orders: 1234 },
      { category: 'trading', listings: 6, orders: 456 },
      { category: 'rwa', listings: 3, orders: 78 },
      { category: 'automation', listings: 2, orders: 234 }
    ],
    ordersOverTime: generateTimeSeriesData(30, 100, 0.3)
  };

  res.json(marketplaceAnalytics);
});

// GET /api/analytics/network - Network/chain analytics
router.get('/network', (req: Request, res: Response) => {
  const networkAnalytics = {
    chain: {
      name: 'Cronos Testnet',
      chainId: 338,
      rpcUrl: 'https://evm-t3.cronos.org',
      explorerUrl: 'https://explorer.cronos.org/testnet'
    },
    contracts: {
      NexusRegistry: {
        address: process.env.NEXUS_REGISTRY_ADDRESS || '0x...',
        transactions: 4567,
        gasUsed: '23.45 CRO'
      },
      WorkflowEngine: {
        address: process.env.WORKFLOW_ENGINE_ADDRESS || '0x...',
        transactions: 2341,
        gasUsed: '45.67 CRO'
      },
      PaymentRouter: {
        address: process.env.PAYMENT_ROUTER_ADDRESS || '0x...',
        transactions: 8923,
        gasUsed: '12.34 CRO'
      },
      AgentMarketplace: {
        address: process.env.AGENT_MARKETPLACE_ADDRESS || '0x...',
        transactions: 3456,
        gasUsed: '34.56 CRO'
      }
    },
    gasStats: {
      avgGasPrice: '5000 Gwei',
      avgTransactionCost: '0.0015 CRO',
      totalGasSpent: '115.02 CRO'
    },
    blockStats: {
      currentBlock: 12345678,
      avgBlockTime: '5.8s',
      transactionsLast24h: 1234
    }
  };

  res.json(networkAnalytics);
});

// GET /api/analytics/leaderboard - Agent leaderboard
router.get('/leaderboard', (req: Request, res: Response) => {
  const { metric = 'calls', limit = 10 } = req.query;

  const leaderboard = {
    metric,
    period: 'all-time',
    entries: [
      {
        rank: 1,
        agentId: 'agent-security-sentinel',
        name: 'Security Sentinel',
        owner: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        calls: 45678,
        revenue: '456780.00',
        rating: 4.95,
        badge: '🏆'
      },
      {
        rank: 2,
        agentId: 'agent-market-oracle',
        name: 'Crypto.com Market Oracle',
        owner: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        calls: 12453,
        revenue: '311325.00',
        rating: 4.70,
        badge: '🥈'
      },
      {
        rank: 3,
        agentId: 'agent-payment-processor',
        name: 'Universal Payment Processor',
        owner: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        calls: 3892,
        revenue: '194600.00',
        rating: 4.80,
        badge: '🥉'
      },
      {
        rank: 4,
        agentId: 'agent-defi-strategist',
        name: 'DeFi Strategist',
        owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        calls: 1247,
        revenue: '124700.00',
        rating: 4.50,
        badge: ''
      },
      {
        rank: 5,
        agentId: 'agent-rwa-manager',
        name: 'RWA Lifecycle Manager',
        owner: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
        calls: 234,
        revenue: '117000.00',
        rating: 4.90,
        badge: ''
      }
    ].slice(0, Number(limit))
  };

  res.json(leaderboard);
});

// GET /api/analytics/realtime - Real-time stats (for dashboard)
router.get('/realtime', (req: Request, res: Response) => {
  // Simulated real-time data
  const realtime = {
    timestamp: new Date().toISOString(),
    activeSessions: Math.floor(Math.random() * 50) + 100,
    pendingTransactions: Math.floor(Math.random() * 20) + 5,
    tps: (Math.random() * 5 + 2).toFixed(2),
    latestTransactions: [
      {
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...',
        type: 'AGENT_CALL',
        value: (Math.random() * 10).toFixed(2),
        timestamp: new Date().toISOString()
      },
      {
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...',
        type: 'PAYMENT',
        value: (Math.random() * 100).toFixed(2),
        timestamp: new Date(Date.now() - 5000).toISOString()
      },
      {
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...',
        type: 'WORKFLOW_EXEC',
        value: (Math.random() * 50).toFixed(2),
        timestamp: new Date(Date.now() - 12000).toISOString()
      }
    ],
    systemHealth: {
      api: 'healthy',
      database: 'healthy',
      blockchain: 'healthy',
      facilitator: 'healthy'
    }
  };

  res.json(realtime);
});

export { router as analyticsRoutes };
