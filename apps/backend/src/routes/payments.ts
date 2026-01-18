import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

const router: Router = Router();

// Types
interface Payment {
  id: string;
  type: 'SIMPLE' | 'SPLIT' | 'STREAMING' | 'CONDITIONAL' | 'RECURRING';
  payer: string;
  totalAmount: string;
  releasedAmount: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
  completedAt: string | null;
  metadata: any;
}

interface SplitRecipient {
  address: string;
  basisPoints: number;
  amount?: string;
}

interface StreamingPayment extends Payment {
  recipient: string;
  startTime: string;
  endTime: string;
  claimedAmount: string;
}

interface RecurringPayment extends Payment {
  recipient: string;
  amount: string;
  interval: number;
  nextPaymentTime: string;
  totalPayments: number;
  completedPayments: number;
}

const payments: Map<string, Payment> = new Map();

// Initialize demo payments
function initDemoPayments() {
  const demoPayments: Payment[] = [
    {
      id: 'pay-demo-1',
      type: 'SPLIT',
      payer: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      totalAmount: '1000000000', // 1000 USDC
      releasedAmount: '1000000000',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        recipients: [
          { address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', basisPoints: 7000 },
          { address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', basisPoints: 2000 },
          { address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', basisPoints: 1000 }
        ]
      }
    },
    {
      id: 'pay-demo-2',
      type: 'STREAMING',
      payer: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      totalAmount: '5000000000', // 5000 USDC
      releasedAmount: '2500000000',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      metadata: {
        recipient: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        startTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'pay-demo-3',
      type: 'RECURRING',
      payer: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      totalAmount: '1200000000', // 1200 USDC (100 x 12)
      releasedAmount: '300000000', // 300 USDC (3 payments)
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      metadata: {
        recipient: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
        amount: '100000000',
        interval: 30 * 24 * 60 * 60,
        totalPayments: 12,
        completedPayments: 3,
        nextPaymentTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ];

  demoPayments.forEach(p => payments.set(p.id, p));
}

initDemoPayments();

// GET /api/payments - List payments
router.get('/', (req: Request, res: Response) => {
  const { payer, type, status, limit = 20, offset = 0 } = req.query;

  let result = Array.from(payments.values());

  if (payer) {
    result = result.filter(p => p.payer.toLowerCase() === (payer as string).toLowerCase());
  }

  if (type) {
    result = result.filter(p => p.type === type);
  }

  if (status) {
    result = result.filter(p => p.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    payments: result,
    pagination: { total, limit: Number(limit), offset: Number(offset) }
  });
});

// GET /api/payments/:id - Get payment details
router.get('/:id', (req: Request, res: Response) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  res.json({ payment });
});

// POST /api/payments/simple - Create simple transfer
router.post('/simple', (req: Request, res: Response) => {
  const { payer, recipient, amount } = req.body;

  if (!payer || !recipient || !amount) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const id = `pay-${uuidv4().slice(0, 8)}`;

  const payment: Payment = {
    id,
    type: 'SIMPLE',
    payer,
    totalAmount: amount,
    releasedAmount: amount,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metadata: { recipient }
  };

  payments.set(id, payment);

  res.status(201).json({
    message: 'Payment created',
    payment,
    x402: {
      paymentRequired: true,
      amount,
      recipient,
      instructions: 'Use x402 middleware to process this payment'
    }
  });
});

// POST /api/payments/split - Create split payment
router.post('/split', (req: Request, res: Response) => {
  const { payer, recipients, totalAmount } = req.body;

  if (!payer || !recipients || recipients.length === 0 || !totalAmount) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Validate basis points sum to 10000
  const totalBps = recipients.reduce((sum: number, r: SplitRecipient) => sum + r.basisPoints, 0);
  if (totalBps !== 10000) {
    res.status(400).json({ error: 'Basis points must sum to 10000' });
    return;
  }

  const id = `pay-${uuidv4().slice(0, 8)}`;

  // Calculate individual amounts
  const recipientsWithAmounts = recipients.map((r: SplitRecipient) => ({
    ...r,
    amount: (BigInt(totalAmount) * BigInt(r.basisPoints) / BigInt(10000)).toString()
  }));

  const payment: Payment = {
    id,
    type: 'SPLIT',
    payer,
    totalAmount,
    releasedAmount: totalAmount,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metadata: { recipients: recipientsWithAmounts }
  };

  payments.set(id, payment);

  res.status(201).json({
    message: 'Split payment created',
    payment,
    distribution: recipientsWithAmounts
  });
});

// POST /api/payments/streaming - Create streaming payment
router.post('/streaming', (req: Request, res: Response) => {
  const { payer, recipient, totalAmount, durationSeconds } = req.body;

  if (!payer || !recipient || !totalAmount || !durationSeconds) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const id = `pay-${uuidv4().slice(0, 8)}`;
  const now = new Date();
  const endTime = new Date(now.getTime() + durationSeconds * 1000);

  const payment: Payment = {
    id,
    type: 'STREAMING',
    payer,
    totalAmount,
    releasedAmount: '0',
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    completedAt: null,
    metadata: {
      recipient,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      claimedAmount: '0',
      ratePerSecond: (BigInt(totalAmount) / BigInt(durationSeconds)).toString()
    }
  };

  payments.set(id, payment);

  res.status(201).json({
    message: 'Streaming payment created',
    payment,
    stream: {
      recipient,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      ratePerSecond: payment.metadata.ratePerSecond,
      totalAmount
    }
  });
});

// POST /api/payments/:id/claim - Claim from streaming payment
router.post('/:id/claim', (req: Request, res: Response) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  if (payment.type !== 'STREAMING') {
    res.status(400).json({ error: 'Can only claim from streaming payments' });
    return;
  }

  if (payment.status !== 'ACTIVE') {
    res.status(400).json({ error: 'Payment is not active' });
    return;
  }

  const now = new Date();
  const startTime = new Date(payment.metadata.startTime);
  const endTime = new Date(payment.metadata.endTime);
  
  const elapsed = Math.min(now.getTime(), endTime.getTime()) - startTime.getTime();
  const totalDuration = endTime.getTime() - startTime.getTime();
  
  const vestedAmount = BigInt(payment.totalAmount) * BigInt(elapsed) / BigInt(totalDuration);
  const claimable = vestedAmount - BigInt(payment.metadata.claimedAmount);

  if (claimable <= 0) {
    res.status(400).json({ error: 'Nothing to claim' });
    return;
  }

  payment.metadata.claimedAmount = vestedAmount.toString();
  payment.releasedAmount = vestedAmount.toString();

  if (vestedAmount >= BigInt(payment.totalAmount)) {
    payment.status = 'COMPLETED';
    payment.completedAt = now.toISOString();
  }

  res.json({
    message: 'Claim successful',
    claimed: claimable.toString(),
    totalClaimed: vestedAmount.toString(),
    remaining: (BigInt(payment.totalAmount) - vestedAmount).toString(),
    payment
  });
});

// POST /api/payments/recurring - Create recurring payment
router.post('/recurring', (req: Request, res: Response) => {
  const { payer, recipient, amount, intervalSeconds, totalPayments } = req.body;

  if (!payer || !recipient || !amount || !intervalSeconds || !totalPayments) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const id = `pay-${uuidv4().slice(0, 8)}`;
  const now = new Date();
  const totalAmount = (BigInt(amount) * BigInt(totalPayments)).toString();

  const payment: Payment = {
    id,
    type: 'RECURRING',
    payer,
    totalAmount,
    releasedAmount: '0',
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    completedAt: null,
    metadata: {
      recipient,
      amount,
      interval: intervalSeconds,
      totalPayments,
      completedPayments: 0,
      nextPaymentTime: now.toISOString()
    }
  };

  payments.set(id, payment);

  res.status(201).json({
    message: 'Recurring payment created',
    payment
  });
});

// POST /api/payments/:id/execute - Execute recurring payment
router.post('/:id/execute', (req: Request, res: Response) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  if (payment.type !== 'RECURRING') {
    res.status(400).json({ error: 'Can only execute recurring payments' });
    return;
  }

  if (payment.status !== 'ACTIVE') {
    res.status(400).json({ error: 'Payment is not active' });
    return;
  }

  const now = new Date();
  const nextPaymentTime = new Date(payment.metadata.nextPaymentTime);

  if (now < nextPaymentTime) {
    res.status(400).json({
      error: 'Payment not yet due',
      nextPaymentTime: payment.metadata.nextPaymentTime
    });
    return;
  }

  // Execute payment
  payment.metadata.completedPayments++;
  payment.releasedAmount = (BigInt(payment.releasedAmount) + BigInt(payment.metadata.amount)).toString();
  payment.metadata.nextPaymentTime = new Date(now.getTime() + payment.metadata.interval * 1000).toISOString();

  if (payment.metadata.completedPayments >= payment.metadata.totalPayments) {
    payment.status = 'COMPLETED';
    payment.completedAt = now.toISOString();
  }

  res.json({
    message: 'Recurring payment executed',
    paymentNumber: payment.metadata.completedPayments,
    amountPaid: payment.metadata.amount,
    totalPaid: payment.releasedAmount,
    remainingPayments: payment.metadata.totalPayments - payment.metadata.completedPayments,
    nextPaymentTime: payment.status === 'ACTIVE' ? payment.metadata.nextPaymentTime : null,
    payment
  });
});

// POST /api/payments/:id/cancel - Cancel a payment
router.post('/:id/cancel', (req: Request, res: Response) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  if (payment.status === 'COMPLETED' || payment.status === 'CANCELLED') {
    res.status(400).json({ error: 'Cannot cancel this payment' });
    return;
  }

  const refundAmount = BigInt(payment.totalAmount) - BigInt(payment.releasedAmount);

  payment.status = 'CANCELLED';
  payment.completedAt = new Date().toISOString();

  res.json({
    message: 'Payment cancelled',
    refundAmount: refundAmount.toString(),
    payment
  });
});

// POST /api/payments/x402 - Create x402 payment authorization
router.post('/x402', (req: Request, res: Response) => {
  const { from, to, amount, validitySeconds = 300 } = req.body;

  if (!from || !to || !amount) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  const paymentObject = {
    from,
    to,
    value: amount,
    validAfter: now - 60,
    validBefore: now + validitySeconds,
    nonce
  };

  // EIP-712 domain
  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: 338,
    verifyingContract: process.env.USDC_ADDRESS || '0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a'
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
    ]
  };

  res.json({
    paymentObject,
    encoding: Buffer.from(JSON.stringify(paymentObject)).toString('base64'),
    eip712: {
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message: paymentObject
    },
    instructions: {
      step1: 'Sign the EIP-712 typed data with the payer wallet',
      step2: 'Include the signature in the X-Payment-Authorization header',
      step3: 'Include the base64 encoded payment object in the X-Payment header',
      step4: 'Send the request to the x402-protected endpoint'
    }
  });
});

// GET /api/payments/stats - Get payment statistics
router.get('/meta/stats', (req: Request, res: Response) => {
  const allPayments = Array.from(payments.values());

  const stats = {
    total: allPayments.length,
    byType: {
      SIMPLE: allPayments.filter(p => p.type === 'SIMPLE').length,
      SPLIT: allPayments.filter(p => p.type === 'SPLIT').length,
      STREAMING: allPayments.filter(p => p.type === 'STREAMING').length,
      CONDITIONAL: allPayments.filter(p => p.type === 'CONDITIONAL').length,
      RECURRING: allPayments.filter(p => p.type === 'RECURRING').length
    },
    byStatus: {
      PENDING: allPayments.filter(p => p.status === 'PENDING').length,
      ACTIVE: allPayments.filter(p => p.status === 'ACTIVE').length,
      COMPLETED: allPayments.filter(p => p.status === 'COMPLETED').length,
      CANCELLED: allPayments.filter(p => p.status === 'CANCELLED').length
    },
    totalVolume: allPayments.reduce((sum, p) => sum + BigInt(p.totalAmount), BigInt(0)).toString(),
    totalReleased: allPayments.reduce((sum, p) => sum + BigInt(p.releasedAmount), BigInt(0)).toString()
  };

  res.json({ stats });
});

export { router as paymentRoutes };
