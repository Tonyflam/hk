/**
 * Price Oracle Agent
 * 
 * A demo AI agent that provides price data and market insights
 * for tokens on Cronos.
 * 
 * Capabilities:
 * - Token price fetching
 * - Price history
 * - Market analysis
 * - Price alerts
 */

import express, { Application } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
app.use(express.json());

const PORT = process.env.ORACLE_AGENT_PORT || 4003;

// Agent metadata
const AGENT_INFO = {
  id: 'price-oracle-001',
  name: 'Price Oracle',
  description: 'AI agent providing real-time price data and market analysis for Cronos tokens',
  capabilities: ['data-oracle', 'analytics'],
  version: '1.0.0',
  pricePerCall: '25000' // 0.025 USDC
};

// Simulated price data (in production, would fetch from actual sources)
const TOKEN_PRICES: Record<string, { price: number; change24h: number; volume24h: number; marketCap: number }> = {
  'CRO': { price: 0.0892, change24h: 2.5, volume24h: 45000000, marketCap: 2400000000 },
  'USDC': { price: 1.00, change24h: 0.01, volume24h: 120000000, marketCap: 25000000000 },
  'USDT': { price: 1.00, change24h: -0.02, volume24h: 95000000, marketCap: 83000000000 },
  'WETH': { price: 3245.50, change24h: 1.8, volume24h: 8500000000, marketCap: 390000000000 },
  'WBTC': { price: 67500.00, change24h: 0.5, volume24h: 12000000000, marketCap: 1320000000000 },
  'VVS': { price: 0.0000032, change24h: -3.2, volume24h: 850000, marketCap: 32000000 },
  'TONIC': { price: 0.0000001, change24h: 5.1, volume24h: 120000, marketCap: 5000000 },
  'FERRO': { price: 0.0012, change24h: 1.2, volume24h: 450000, marketCap: 12000000 }
};

// Generate price history
function generatePriceHistory(token: string, days: number = 7): any[] {
  const basePrice = TOKEN_PRICES[token]?.price || 1;
  const history = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate price variation
    const variation = (Math.random() - 0.5) * 0.1; // ±5%
    const price = basePrice * (1 + variation);
    
    history.push({
      date: date.toISOString().split('T')[0],
      open: price * (1 - Math.random() * 0.02),
      high: price * (1 + Math.random() * 0.03),
      low: price * (1 - Math.random() * 0.03),
      close: price,
      volume: TOKEN_PRICES[token]?.volume24h * (0.8 + Math.random() * 0.4)
    });
  }
  
  return history;
}

// Get current price
function getPrice(token: string): any {
  const tokenUpper = token.toUpperCase();
  const data = TOKEN_PRICES[tokenUpper];
  
  if (!data) {
    return {
      error: 'Token not found',
      availableTokens: Object.keys(TOKEN_PRICES)
    };
  }

  return {
    token: tokenUpper,
    price: data.price,
    priceFormatted: data.price >= 1 
      ? `$${data.price.toFixed(2)}`
      : `$${data.price.toFixed(8)}`,
    change24h: data.change24h,
    change24hFormatted: `${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%`,
    volume24h: data.volume24h,
    volume24hFormatted: `$${(data.volume24h / 1e6).toFixed(2)}M`,
    marketCap: data.marketCap,
    marketCapFormatted: data.marketCap >= 1e9 
      ? `$${(data.marketCap / 1e9).toFixed(2)}B`
      : `$${(data.marketCap / 1e6).toFixed(2)}M`,
    lastUpdated: new Date().toISOString()
  };
}

// Get multiple prices
function getPrices(tokens: string[]): any {
  return {
    prices: tokens.map(t => getPrice(t)).filter(p => !p.error),
    timestamp: new Date().toISOString()
  };
}

// Market analysis
function analyzeMarket(): any {
  const tokens = Object.keys(TOKEN_PRICES);
  const gainers = tokens
    .map(t => ({ token: t, ...TOKEN_PRICES[t] }))
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 3);
  
  const losers = tokens
    .map(t => ({ token: t, ...TOKEN_PRICES[t] }))
    .sort((a, b) => a.change24h - b.change24h)
    .slice(0, 3);
  
  const totalVolume = Object.values(TOKEN_PRICES).reduce((sum, t) => sum + t.volume24h, 0);
  const totalMarketCap = Object.values(TOKEN_PRICES).reduce((sum, t) => sum + t.marketCap, 0);
  
  const avgChange = tokens.reduce((sum, t) => sum + TOKEN_PRICES[t].change24h, 0) / tokens.length;
  
  return {
    summary: {
      totalMarketCap: totalMarketCap,
      totalMarketCapFormatted: `$${(totalMarketCap / 1e12).toFixed(2)}T`,
      total24hVolume: totalVolume,
      total24hVolumeFormatted: `$${(totalVolume / 1e9).toFixed(2)}B`,
      averageChange24h: avgChange,
      sentiment: avgChange >= 1 ? 'Bullish' : avgChange <= -1 ? 'Bearish' : 'Neutral'
    },
    topGainers: gainers.map(t => ({
      token: t.token,
      price: t.price,
      change: `+${t.change24h.toFixed(2)}%`
    })),
    topLosers: losers.map(t => ({
      token: t.token,
      price: t.price,
      change: `${t.change24h.toFixed(2)}%`
    })),
    cronosEcosystem: {
      nativeToken: 'CRO',
      croPrice: TOKEN_PRICES['CRO'].price,
      croChange: TOKEN_PRICES['CRO'].change24h,
      ecosystemTokens: tokens.filter(t => !['WETH', 'WBTC', 'USDC', 'USDT'].includes(t)).length
    },
    analyzedAt: new Date().toISOString()
  };
}

// Convert amount between tokens
function convertAmount(params: { from: string; to: string; amount: number }): any {
  const fromToken = params.from.toUpperCase();
  const toToken = params.to.toUpperCase();
  
  const fromPrice = TOKEN_PRICES[fromToken];
  const toPrice = TOKEN_PRICES[toToken];
  
  if (!fromPrice || !toPrice) {
    return {
      error: 'Token not found',
      availableTokens: Object.keys(TOKEN_PRICES)
    };
  }

  const valueUSD = params.amount * fromPrice.price;
  const resultAmount = valueUSD / toPrice.price;

  return {
    from: {
      token: fromToken,
      amount: params.amount,
      price: fromPrice.price,
      valueUSD
    },
    to: {
      token: toToken,
      amount: resultAmount,
      price: toPrice.price,
      valueUSD
    },
    rate: fromPrice.price / toPrice.price,
    rateFormatted: `1 ${fromToken} = ${(fromPrice.price / toPrice.price).toFixed(8)} ${toToken}`,
    timestamp: new Date().toISOString()
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
      case 'getPrice':
        result = getPrice(params.token || 'CRO');
        break;

      case 'getPrices':
        result = getPrices(params.tokens || ['CRO', 'USDC', 'WETH', 'WBTC']);
        break;

      case 'getPriceHistory':
        const token = (params.token || 'CRO').toUpperCase();
        result = {
          token,
          days: params.days || 7,
          history: generatePriceHistory(token, params.days || 7),
          currentPrice: TOKEN_PRICES[token]?.price
        };
        break;

      case 'analyzeMarket':
        result = analyzeMarket();
        break;

      case 'convert':
        result = convertAmount({
          from: params.from || 'CRO',
          to: params.to || 'USDC',
          amount: params.amount || 1
        });
        break;

      case 'listTokens':
        result = {
          tokens: Object.keys(TOKEN_PRICES).map(t => ({
            symbol: t,
            price: TOKEN_PRICES[t].price,
            change24h: TOKEN_PRICES[t].change24h
          }))
        };
        break;

      default:
        result = {
          error: 'Unknown action',
          availableActions: [
            'getPrice',
            'getPrices',
            'getPriceHistory',
            'analyzeMarket',
            'convert',
            'listTokens'
          ]
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
  console.log(`📊 Price Oracle Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info: http://localhost:${PORT}/info`);
  console.log(`   Call: POST http://localhost:${PORT}/call`);
});

export { app, AGENT_INFO };
