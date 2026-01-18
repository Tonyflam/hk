/**
 * DeFi Strategist Agent
 * 
 * A demo AI agent that provides DeFi strategy recommendations
 * based on market conditions on Cronos.
 * 
 * Capabilities:
 * - Analyze DeFi protocols
 * - Recommend yield strategies
 * - Calculate optimal positions
 * - Risk assessment
 */

import express, { Application } from 'express';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
app.use(express.json());

const PORT = process.env.DEFI_AGENT_PORT || 4001;

// Simulated DeFi data (in production, would fetch from actual protocols)
const DEFI_PROTOCOLS = [
  {
    name: 'VVS Finance',
    type: 'DEX',
    tvl: 45000000,
    apy: { min: 5, max: 120 },
    risk: 'medium',
    tokens: ['CRO', 'USDC', 'USDT', 'WETH', 'WBTC']
  },
  {
    name: 'Tectonic',
    type: 'Lending',
    tvl: 28000000,
    apy: { supply: 3.5, borrow: 8.2 },
    risk: 'low',
    tokens: ['CRO', 'USDC', 'USDT', 'WETH']
  },
  {
    name: 'Ferro Protocol',
    type: 'Stableswap',
    tvl: 15000000,
    apy: { min: 4, max: 25 },
    risk: 'low',
    tokens: ['USDC', 'USDT', 'DAI']
  },
  {
    name: 'Single Finance',
    type: 'Yield Aggregator',
    tvl: 12000000,
    apy: { min: 10, max: 80 },
    risk: 'high',
    tokens: ['CRO', 'USDC', 'VVS']
  }
];

// Agent metadata
const AGENT_INFO = {
  id: 'defi-strategist-001',
  name: 'DeFi Strategist',
  description: 'AI agent specialized in DeFi strategy recommendations on Cronos',
  capabilities: ['defi', 'analytics', 'trading'],
  version: '1.0.0',
  pricePerCall: '100000' // 0.10 USDC
};

// Strategy recommendation engine
function generateStrategy(params: {
  amount: number;
  riskTolerance: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  preferredTokens?: string[];
}): any {
  const { amount, riskTolerance, timeHorizon, preferredTokens } = params;

  // Filter protocols by risk tolerance
  const suitableProtocols = DEFI_PROTOCOLS.filter(p => {
    if (riskTolerance === 'low') return p.risk === 'low';
    if (riskTolerance === 'medium') return p.risk !== 'high';
    return true;
  });

  // Generate allocation strategy
  const allocations = suitableProtocols.map(protocol => {
    const weight = Math.random() * 0.3 + 0.1; // 10-40% per protocol
    const apy = protocol.apy;
    const expectedApy = typeof apy === 'object' && 'min' in apy && apy.min !== undefined && apy.max !== undefined
      ? (apy.min + apy.max) / 2 
      : (typeof apy === 'object' && 'supply' in apy ? apy.supply : 5) || 5;
    
    return {
      protocol: protocol.name,
      type: protocol.type,
      allocation: Math.round(weight * amount * 100) / 100,
      allocationPercent: Math.round(weight * 100),
      expectedApy: expectedApy,
      risk: protocol.risk
    };
  });

  // Normalize allocations to 100%
  const totalPercent = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  allocations.forEach(a => {
    a.allocationPercent = Math.round((a.allocationPercent / totalPercent) * 100);
    a.allocation = Math.round((a.allocationPercent / 100) * amount * 100) / 100;
  });

  // Calculate expected returns
  const weightedApy = allocations.reduce(
    (sum, a) => sum + (a.expectedApy * a.allocationPercent / 100), 
    0
  );

  const expectedReturn = {
    daily: Math.round(amount * (weightedApy / 365) * 100) / 100,
    weekly: Math.round(amount * (weightedApy / 52) * 100) / 100,
    monthly: Math.round(amount * (weightedApy / 12) * 100) / 100,
    yearly: Math.round(amount * (weightedApy / 100) * 100) / 100
  };

  return {
    strategy: {
      name: `${riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1)} ${timeHorizon} Strategy`,
      totalInvestment: amount,
      riskLevel: riskTolerance,
      timeHorizon: timeHorizon,
      allocations: allocations.filter(a => a.allocationPercent > 0),
      expectedApy: Math.round(weightedApy * 100) / 100,
      expectedReturn
    },
    recommendations: [
      `Diversify across ${allocations.length} protocols to minimize risk`,
      riskTolerance === 'low' 
        ? 'Focus on established protocols with proven track records'
        : 'Consider higher-yield opportunities with proper risk management',
      timeHorizon === 'long'
        ? 'Compound earnings regularly for maximum growth'
        : 'Monitor positions closely and be ready to rebalance',
      'Always maintain emergency liquidity outside DeFi positions'
    ],
    warnings: [
      'DeFi investments carry smart contract risk',
      'APY rates are variable and may change',
      'This is not financial advice - do your own research'
    ],
    generatedAt: new Date().toISOString()
  };
}

// Analyze protocol
function analyzeProtocol(protocolName: string): any {
  const protocol = DEFI_PROTOCOLS.find(
    p => p.name.toLowerCase() === protocolName.toLowerCase()
  );

  if (!protocol) {
    return {
      error: 'Protocol not found',
      availableProtocols: DEFI_PROTOCOLS.map(p => p.name)
    };
  }

  return {
    protocol: protocol.name,
    type: protocol.type,
    tvl: protocol.tvl,
    tvlFormatted: `$${(protocol.tvl / 1e6).toFixed(2)}M`,
    apy: protocol.apy,
    riskLevel: protocol.risk,
    supportedTokens: protocol.tokens,
    analysis: {
      liquidity: protocol.tvl > 20000000 ? 'High' : protocol.tvl > 10000000 ? 'Medium' : 'Low',
      stability: protocol.risk === 'low' ? 'Stable' : protocol.risk === 'medium' ? 'Moderate' : 'Volatile',
      recommendation: protocol.risk === 'low' 
        ? 'Suitable for conservative investors'
        : protocol.risk === 'medium'
        ? 'Good for balanced portfolios'
        : 'For experienced DeFi users only'
    },
    analyzedAt: new Date().toISOString()
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: AGENT_INFO.name, version: AGENT_INFO.version });
});

// Agent info
app.get('/info', (req, res) => {
  res.json(AGENT_INFO);
});

// Main agent endpoint
app.post('/call', (req, res) => {
  const { action, params } = req.body;

  try {
    let result: any;

    switch (action) {
      case 'generateStrategy':
        result = generateStrategy({
          amount: params.amount || 1000,
          riskTolerance: params.riskTolerance || 'medium',
          timeHorizon: params.timeHorizon || 'medium',
          preferredTokens: params.preferredTokens
        });
        break;

      case 'analyzeProtocol':
        result = analyzeProtocol(params.protocol);
        break;

      case 'listProtocols':
        result = {
          protocols: DEFI_PROTOCOLS.map(p => ({
            name: p.name,
            type: p.type,
            tvl: `$${(p.tvl / 1e6).toFixed(2)}M`,
            risk: p.risk
          }))
        };
        break;

      case 'calculateYield':
        const protocol = DEFI_PROTOCOLS.find(
          p => p.name.toLowerCase() === (params.protocol || '').toLowerCase()
        );
        const protocolApy = protocol?.apy;
        const apyValue = protocol 
          ? (typeof protocolApy === 'object' && protocolApy && 'min' in protocolApy && protocolApy.min !== undefined && protocolApy.max !== undefined
              ? (protocolApy.min + protocolApy.max) / 2 
              : (typeof protocolApy === 'object' && protocolApy && 'supply' in protocolApy ? protocolApy.supply : 10) || 10)
          : params.apy || 10;
        const amount = params.amount || 1000;
        result = {
          principal: amount,
          apy: apyValue,
          projectedReturns: {
            day1: Math.round(amount * (apyValue / 36500) * 100) / 100,
            week1: Math.round(amount * (apyValue / 5200) * 100) / 100,
            month1: Math.round(amount * (apyValue / 1200) * 100) / 100,
            year1: Math.round(amount * (apyValue / 100) * 100) / 100
          }
        };
        break;

      default:
        result = {
          error: 'Unknown action',
          availableActions: ['generateStrategy', 'analyzeProtocol', 'listProtocols', 'calculateYield']
        };
    }

    res.json({
      success: true,
      agent: AGENT_INFO.name,
      action,
      result,
      executedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 DeFi Strategist Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info: http://localhost:${PORT}/info`);
  console.log(`   Call: POST http://localhost:${PORT}/call`);
});

export { app, AGENT_INFO };
