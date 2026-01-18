/**
 * Payment Processor Agent
 * 
 * A demo AI agent that handles complex payment scenarios
 * using the x402 protocol on Cronos.
 * 
 * Capabilities:
 * - Invoice generation
 * - Payment splitting
 * - Escrow management
 * - Recurring payment setup
 */

import express, { Application } from 'express';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
app.use(express.json());

const PORT = process.env.PAYMENT_AGENT_PORT || 4002;

// Agent metadata
const AGENT_INFO = {
  id: 'payment-processor-001',
  name: 'Payment Processor',
  description: 'AI agent specialized in x402 payment processing and automation on Cronos',
  capabilities: ['payments', 'automation'],
  version: '1.0.0',
  pricePerCall: '50000' // 0.05 USDC
};

// Invoice storage (in-memory for demo)
const invoices: Map<string, any> = new Map();
const escrows: Map<string, any> = new Map();

// Generate invoice
function generateInvoice(params: {
  recipient: string;
  amount: number;
  currency: string;
  description: string;
  dueDate?: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number }>;
}): any {
  const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const items = params.items || [{
    name: params.description,
    quantity: 1,
    unitPrice: params.amount
  }];

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = 0; // No tax for crypto
  const total = subtotal + tax;

  const invoice = {
    invoiceId,
    recipient: params.recipient,
    amount: total,
    amountMicroUSDC: (total * 1e6).toString(),
    currency: params.currency || 'USDC',
    description: params.description,
    items,
    subtotal,
    tax,
    total,
    status: 'pending',
    dueDate: params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    x402PaymentUrl: `https://nexus-402.app/pay/${invoiceId}`,
    paymentInstructions: {
      network: 'Cronos',
      chainId: 338,
      token: 'USDC.e',
      tokenAddress: '0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a',
      amount: (total * 1e6).toString(),
      recipient: params.recipient
    }
  };

  invoices.set(invoiceId, invoice);
  return invoice;
}

// Create payment split
function createPaymentSplit(params: {
  totalAmount: number;
  recipients: Array<{ address: string; share: number; label?: string }>;
  description: string;
}): any {
  const splitId = `SPLIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // Validate shares sum to 100 or normalize
  const totalShares = params.recipients.reduce((sum, r) => sum + r.share, 0);
  
  const distributions = params.recipients.map(r => ({
    address: r.address,
    share: r.share,
    sharePercent: Math.round((r.share / totalShares) * 100),
    amount: Math.round((r.share / totalShares) * params.totalAmount * 100) / 100,
    amountMicroUSDC: Math.round((r.share / totalShares) * params.totalAmount * 1e6).toString(),
    label: r.label || 'Recipient'
  }));

  return {
    splitId,
    description: params.description,
    totalAmount: params.totalAmount,
    totalAmountMicroUSDC: (params.totalAmount * 1e6).toString(),
    recipientCount: params.recipients.length,
    distributions,
    status: 'ready',
    createdAt: new Date().toISOString(),
    instructions: 'Sign the x402 payment to distribute funds to all recipients in a single transaction'
  };
}

// Setup recurring payment
function setupRecurringPayment(params: {
  recipient: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  maxPayments?: number;
}): any {
  const scheduleId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const frequencyDays = {
    daily: 1,
    weekly: 7,
    monthly: 30
  };

  const startDate = params.startDate ? new Date(params.startDate) : new Date();
  const nextPayment = new Date(startDate);
  
  // Calculate payment schedule
  const maxPayments = params.maxPayments || 12;
  const schedule = [];
  
  for (let i = 0; i < Math.min(maxPayments, 12); i++) {
    const paymentDate = new Date(nextPayment);
    paymentDate.setDate(paymentDate.getDate() + i * frequencyDays[params.frequency]);
    
    if (params.endDate && paymentDate > new Date(params.endDate)) break;
    
    schedule.push({
      paymentNumber: i + 1,
      scheduledDate: paymentDate.toISOString(),
      amount: params.amount,
      status: 'scheduled'
    });
  }

  return {
    scheduleId,
    recipient: params.recipient,
    amount: params.amount,
    amountMicroUSDC: (params.amount * 1e6).toString(),
    frequency: params.frequency,
    startDate: startDate.toISOString(),
    endDate: params.endDate,
    totalScheduledPayments: schedule.length,
    totalAmount: schedule.length * params.amount,
    schedule: schedule.slice(0, 6), // Show first 6 payments
    status: 'active',
    createdAt: new Date().toISOString(),
    note: 'Recurring payments require pre-authorization of USDC allowance'
  };
}

// Create escrow
function createEscrow(params: {
  payer: string;
  payee: string;
  amount: number;
  description: string;
  releaseConditions: string[];
  expirationDays?: number;
}): any {
  const escrowId = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + (params.expirationDays || 30));

  const escrow = {
    escrowId,
    payer: params.payer,
    payee: params.payee,
    amount: params.amount,
    amountMicroUSDC: (params.amount * 1e6).toString(),
    description: params.description,
    releaseConditions: params.releaseConditions,
    expirationDate: expirationDate.toISOString(),
    status: 'awaiting_deposit',
    createdAt: new Date().toISOString(),
    actions: {
      deposit: 'Payer deposits funds to escrow contract',
      release: 'Agent releases funds when conditions are met',
      dispute: 'Either party can raise a dispute',
      refund: 'Funds returned to payer if conditions not met'
    }
  };

  escrows.set(escrowId, escrow);
  return escrow;
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
      case 'generateInvoice':
        result = generateInvoice({
          recipient: params.recipient || '0x0000000000000000000000000000000000000000',
          amount: params.amount || 100,
          currency: params.currency || 'USDC',
          description: params.description || 'Payment',
          dueDate: params.dueDate,
          items: params.items
        });
        break;

      case 'createPaymentSplit':
        result = createPaymentSplit({
          totalAmount: params.totalAmount || 100,
          recipients: params.recipients || [
            { address: '0x1111111111111111111111111111111111111111', share: 50, label: 'Developer' },
            { address: '0x2222222222222222222222222222222222222222', share: 30, label: 'Designer' },
            { address: '0x3333333333333333333333333333333333333333', share: 20, label: 'Manager' }
          ],
          description: params.description || 'Revenue split'
        });
        break;

      case 'setupRecurring':
        result = setupRecurringPayment({
          recipient: params.recipient || '0x0000000000000000000000000000000000000000',
          amount: params.amount || 50,
          frequency: params.frequency || 'monthly',
          startDate: params.startDate,
          endDate: params.endDate,
          maxPayments: params.maxPayments
        });
        break;

      case 'createEscrow':
        result = createEscrow({
          payer: params.payer || '0x0000000000000000000000000000000000000000',
          payee: params.payee || '0x0000000000000000000000000000000000000000',
          amount: params.amount || 1000,
          description: params.description || 'Escrow payment',
          releaseConditions: params.releaseConditions || ['Delivery confirmed', 'Quality approved'],
          expirationDays: params.expirationDays
        });
        break;

      case 'getInvoice':
        result = invoices.get(params.invoiceId) || { error: 'Invoice not found' };
        break;

      case 'getEscrow':
        result = escrows.get(params.escrowId) || { error: 'Escrow not found' };
        break;

      default:
        result = {
          error: 'Unknown action',
          availableActions: [
            'generateInvoice',
            'createPaymentSplit',
            'setupRecurring',
            'createEscrow',
            'getInvoice',
            'getEscrow'
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
  console.log(`💸 Payment Processor Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info: http://localhost:${PORT}/info`);
  console.log(`   Call: POST http://localhost:${PORT}/call`);
});

export { app, AGENT_INFO };
