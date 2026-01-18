import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();

// Types
interface ServiceListing {
  id: string;
  agentId: string;
  provider: string;
  name: string;
  description: string;
  category: string;
  pricePerUnit: string;
  minUnits: number;
  maxUnits: number;
  isActive: boolean;
  totalSales: number;
  totalRevenue: string;
  rating: number;
  ratingCount: number;
  createdAt: string;
}

interface Order {
  id: string;
  listingId: string;
  buyer: string;
  units: number;
  totalPrice: string;
  status: 'PENDING' | 'ACCEPTED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
  deliveryData: string | null;
  createdAt: string;
  completedAt: string | null;
}

const listings: Map<string, ServiceListing> = new Map();
const orders: Map<string, Order> = new Map();

const CATEGORIES = [
  'defi',
  'payments',
  'analytics',
  'trading',
  'data-oracle',
  'automation',
  'security',
  'rwa'
];

// Initialize demo listings
function initDemoListings() {
  const demoListings: ServiceListing[] = [
    {
      id: 'listing-defi-analysis',
      agentId: 'agent-defi-strategist',
      provider: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      name: 'DeFi Portfolio Analysis',
      description: 'Comprehensive analysis of your DeFi positions across Cronos protocols. Includes yield optimization suggestions and risk assessment.',
      category: 'defi',
      pricePerUnit: '500000', // 0.5 USDC per analysis
      minUnits: 1,
      maxUnits: 10,
      isActive: true,
      totalSales: 234,
      totalRevenue: '117000000',
      rating: 460,
      ratingCount: 78,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing-payment-automation',
      agentId: 'agent-payment-processor',
      provider: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      name: 'Payment Workflow Setup',
      description: 'Configure automated payment workflows including splits, streams, and recurring payments. Full x402 integration.',
      category: 'payments',
      pricePerUnit: '1000000', // 1 USDC per setup
      minUnits: 1,
      maxUnits: 5,
      isActive: true,
      totalSales: 156,
      totalRevenue: '156000000',
      rating: 485,
      ratingCount: 92,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing-market-report',
      agentId: 'agent-market-oracle',
      provider: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      name: 'AI Market Intelligence Report',
      description: 'Daily AI-generated market intelligence report with price predictions, sentiment analysis, and trading signals powered by Crypto.com data.',
      category: 'analytics',
      pricePerUnit: '250000', // 0.25 USDC per report
      minUnits: 1,
      maxUnits: 30,
      isActive: true,
      totalSales: 1892,
      totalRevenue: '473000000',
      rating: 475,
      ratingCount: 456,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing-security-audit',
      agentId: 'agent-security-sentinel',
      provider: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
      name: 'Transaction Security Scan',
      description: 'AI-powered security analysis of smart contracts and transactions. Honeypot detection, rug-pull analysis, and risk scoring.',
      category: 'security',
      pricePerUnit: '100000', // 0.1 USDC per scan
      minUnits: 1,
      maxUnits: 100,
      isActive: true,
      totalSales: 8923,
      totalRevenue: '892300000',
      rating: 495,
      ratingCount: 1234,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing-rwa-tokenization',
      agentId: 'agent-rwa-manager',
      provider: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      name: 'RWA Tokenization Consultation',
      description: 'Expert consultation on tokenizing real-world assets on Cronos. Includes compliance guidance and settlement setup.',
      category: 'rwa',
      pricePerUnit: '5000000', // 5 USDC per consultation
      minUnits: 1,
      maxUnits: 3,
      isActive: true,
      totalSales: 45,
      totalRevenue: '225000000',
      rating: 490,
      ratingCount: 28,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  demoListings.forEach(l => listings.set(l.id, l));
}

initDemoListings();

// GET /api/marketplace/listings - List all listings
router.get('/listings', (req: Request, res: Response) => {
  const { category, provider, active, sort, limit = 20, offset = 0 } = req.query;

  let result = Array.from(listings.values());

  if (category) {
    result = result.filter(l => l.category === category);
  }

  if (provider) {
    result = result.filter(l => l.provider.toLowerCase() === (provider as string).toLowerCase());
  }

  if (active !== undefined) {
    result = result.filter(l => l.isActive === (active === 'true'));
  }

  // Sort
  if (sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'sales') {
    result.sort((a, b) => b.totalSales - a.totalSales);
  } else if (sort === 'price-low') {
    result.sort((a, b) => parseFloat(a.pricePerUnit) - parseFloat(b.pricePerUnit));
  } else if (sort === 'price-high') {
    result.sort((a, b) => parseFloat(b.pricePerUnit) - parseFloat(a.pricePerUnit));
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    listings: result,
    pagination: { total, limit: Number(limit), offset: Number(offset) }
  });
});

// GET /api/marketplace/listings/:id - Get listing details
router.get('/listings/:id', (req: Request, res: Response) => {
  const listing = listings.get(req.params.id);

  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  res.json({ listing });
});

// POST /api/marketplace/listings - Create new listing
router.post('/listings', (req: Request, res: Response) => {
  const { agentId, provider, name, description, category, pricePerUnit, minUnits, maxUnits } = req.body;

  if (!agentId || !provider || !name || !category || !pricePerUnit) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'Invalid category', validCategories: CATEGORIES });
    return;
  }

  const id = `listing-${uuidv4().slice(0, 8)}`;

  const listing: ServiceListing = {
    id,
    agentId,
    provider,
    name,
    description: description || '',
    category,
    pricePerUnit,
    minUnits: minUnits || 1,
    maxUnits: maxUnits || 100,
    isActive: true,
    totalSales: 0,
    totalRevenue: '0',
    rating: 0,
    ratingCount: 0,
    createdAt: new Date().toISOString()
  };

  listings.set(id, listing);

  res.status(201).json({
    message: 'Listing created successfully',
    listing
  });
});

// POST /api/marketplace/orders - Create order
router.post('/orders', (req: Request, res: Response) => {
  const { listingId, buyer, units } = req.body;

  if (!listingId || !buyer || !units) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const listing = listings.get(listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  if (!listing.isActive) {
    res.status(400).json({ error: 'Listing is not active' });
    return;
  }

  if (units < listing.minUnits || units > listing.maxUnits) {
    res.status(400).json({ 
      error: 'Invalid units',
      min: listing.minUnits,
      max: listing.maxUnits
    });
    return;
  }

  const totalPrice = (BigInt(listing.pricePerUnit) * BigInt(units)).toString();
  const id = `order-${uuidv4().slice(0, 8)}`;

  const order: Order = {
    id,
    listingId,
    buyer,
    units,
    totalPrice,
    status: 'PENDING',
    deliveryData: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  orders.set(id, order);

  res.status(201).json({
    message: 'Order created',
    order,
    payment: {
      amount: totalPrice,
      currency: 'USDC',
      recipient: listing.provider,
      x402Instructions: 'Use x402 payment to complete this order'
    }
  });
});

// GET /api/marketplace/orders - List orders
router.get('/orders', (req: Request, res: Response) => {
  const { buyer, listingId, status, limit = 20, offset = 0 } = req.query;

  let result = Array.from(orders.values());

  if (buyer) {
    result = result.filter(o => o.buyer.toLowerCase() === (buyer as string).toLowerCase());
  }

  if (listingId) {
    result = result.filter(o => o.listingId === listingId);
  }

  if (status) {
    result = result.filter(o => o.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    orders: result,
    pagination: { total, limit: Number(limit), offset: Number(offset) }
  });
});

// GET /api/marketplace/orders/:id - Get order details
router.get('/orders/:id', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const listing = listings.get(order.listingId);

  res.json({ order, listing });
});

// POST /api/marketplace/orders/:id/accept - Accept order (provider)
router.post('/orders/:id/accept', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order.status !== 'PENDING') {
    res.status(400).json({ error: 'Order cannot be accepted' });
    return;
  }

  order.status = 'ACCEPTED';

  res.json({
    message: 'Order accepted',
    order
  });
});

// POST /api/marketplace/orders/:id/deliver - Deliver order (provider)
router.post('/orders/:id/deliver', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  const { deliveryData } = req.body;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order.status !== 'ACCEPTED') {
    res.status(400).json({ error: 'Order cannot be delivered' });
    return;
  }

  order.status = 'DELIVERED';
  order.deliveryData = deliveryData || 'Delivered via API';

  res.json({
    message: 'Order delivered',
    order
  });
});

// POST /api/marketplace/orders/:id/complete - Complete order (buyer)
router.post('/orders/:id/complete', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  const { rating } = req.body;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order.status !== 'DELIVERED') {
    res.status(400).json({ error: 'Order cannot be completed' });
    return;
  }

  order.status = 'COMPLETED';
  order.completedAt = new Date().toISOString();

  // Update listing stats
  const listing = listings.get(order.listingId);
  if (listing) {
    listing.totalSales += order.units;
    listing.totalRevenue = (BigInt(listing.totalRevenue) + BigInt(order.totalPrice)).toString();

    if (rating && rating >= 1 && rating <= 5) {
      const totalRating = listing.rating * listing.ratingCount;
      listing.ratingCount++;
      listing.rating = Math.round((totalRating + rating * 100) / listing.ratingCount);
    }
  }

  res.json({
    message: 'Order completed',
    order
  });
});

// GET /api/marketplace/categories - List categories
router.get('/categories', (req: Request, res: Response) => {
  const categoryStats = CATEGORIES.map(category => {
    const categoryListings = Array.from(listings.values()).filter(l => l.category === category);
    return {
      name: category,
      listingCount: categoryListings.length,
      activeListings: categoryListings.filter(l => l.isActive).length
    };
  });

  res.json({ categories: categoryStats });
});

// GET /api/marketplace/stats - Marketplace statistics
router.get('/stats', (req: Request, res: Response) => {
  const allListings = Array.from(listings.values());
  const allOrders = Array.from(orders.values());

  const stats = {
    listings: {
      total: allListings.length,
      active: allListings.filter(l => l.isActive).length
    },
    orders: {
      total: allOrders.length,
      pending: allOrders.filter(o => o.status === 'PENDING').length,
      completed: allOrders.filter(o => o.status === 'COMPLETED').length
    },
    volume: {
      total: allOrders.reduce((sum, o) => sum + BigInt(o.totalPrice), BigInt(0)).toString(),
      completed: allOrders
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + BigInt(o.totalPrice), BigInt(0)).toString()
    },
    topCategories: CATEGORIES.map(cat => ({
      category: cat,
      listings: allListings.filter(l => l.category === cat).length
    })).sort((a, b) => b.listings - a.listings).slice(0, 5)
  };

  res.json({ stats });
});

export { router as marketplaceRoutes };
