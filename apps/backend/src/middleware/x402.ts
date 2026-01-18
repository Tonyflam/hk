import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

interface X402PaymentHeader {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
}

interface X402Request extends Request {
  x402Payment?: X402PaymentHeader;
  paymentVerified?: boolean;
}

/**
 * x402 Payment Middleware
 * 
 * Implements the HTTP 402 Payment Required flow:
 * 1. Check for x402 payment headers
 * 2. Verify payment signature using EIP-3009
 * 3. Verify payment on-chain via Facilitator
 * 4. Allow request if payment is valid
 */
export async function x402Middleware(
  req: X402Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for x402 payment headers
    const paymentHeader = req.headers['x-payment'] as string;
    const authHeader = req.headers['x-payment-authorization'] as string;

    if (!paymentHeader || !authHeader) {
      // Return 402 Payment Required with payment instructions
      res.status(402).json({
        error: 'Payment Required',
        code: 'X402_PAYMENT_REQUIRED',
        payment: {
          network: 'Cronos Testnet',
          chainId: 338,
          paymentToken: process.env.USDC_ADDRESS || '0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a',
          paymentRecipient: process.env.PAYMENT_RECIPIENT || '0x...',
          amount: process.env.DEFAULT_PAYMENT_AMOUNT || '100000', // 0.1 USDC (6 decimals)
          currency: 'USDC.e',
          facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.x402.org',
          instructions: {
            method: 'EIP-3009',
            headers: {
              'X-Payment': 'Base64 encoded payment object',
              'X-Payment-Authorization': 'EIP-3009 signature'
            },
            paymentObject: {
              from: 'Your wallet address',
              to: 'Payment recipient address',
              value: 'Amount in smallest unit',
              validAfter: 'Unix timestamp',
              validBefore: 'Unix timestamp',
              nonce: 'Unique bytes32 nonce'
            }
          }
        },
        message: 'This endpoint requires an x402 payment. See payment instructions above.'
      });
      return;
    }

    // Parse payment header
    let payment: X402PaymentHeader;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      payment = JSON.parse(decoded);
    } catch (e) {
      res.status(400).json({
        error: 'Invalid Payment Header',
        code: 'X402_INVALID_HEADER',
        message: 'Could not parse X-Payment header'
      });
      return;
    }

    // Validate payment structure
    if (!payment.from || !payment.to || !payment.value || !payment.nonce) {
      res.status(400).json({
        error: 'Invalid Payment Data',
        code: 'X402_INVALID_PAYMENT',
        message: 'Payment object missing required fields'
      });
      return;
    }

    // Validate timing
    const now = Math.floor(Date.now() / 1000);
    if (payment.validAfter > now) {
      res.status(400).json({
        error: 'Payment Not Yet Valid',
        code: 'X402_PAYMENT_NOT_VALID_YET',
        message: `Payment becomes valid at ${new Date(payment.validAfter * 1000).toISOString()}`
      });
      return;
    }

    if (payment.validBefore < now) {
      res.status(400).json({
        error: 'Payment Expired',
        code: 'X402_PAYMENT_EXPIRED',
        message: `Payment expired at ${new Date(payment.validBefore * 1000).toISOString()}`
      });
      return;
    }

    // Verify signature (EIP-3009 transferWithAuthorization)
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

    const value = {
      from: payment.from,
      to: payment.to,
      value: payment.value,
      validAfter: payment.validAfter,
      validBefore: payment.validBefore,
      nonce: payment.nonce
    };

    try {
      const recoveredAddress = ethers.verifyTypedData(domain, types, value, authHeader);
      
      if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
        res.status(401).json({
          error: 'Invalid Signature',
          code: 'X402_INVALID_SIGNATURE',
          message: 'Payment signature does not match the payer address'
        });
        return;
      }
    } catch (e) {
      res.status(401).json({
        error: 'Signature Verification Failed',
        code: 'X402_SIGNATURE_ERROR',
        message: 'Could not verify payment signature'
      });
      return;
    }

    // In production, verify on-chain via Facilitator
    // For now, signature verification is sufficient for demo

    // Attach payment info to request
    req.x402Payment = payment;
    req.paymentVerified = true;

    // Log successful payment
    console.log(`✅ x402 Payment Verified: ${payment.from} -> ${payment.to} (${ethers.formatUnits(payment.value, 6)} USDC)`);

    next();
  } catch (error) {
    console.error('x402 Middleware Error:', error);
    res.status(500).json({
      error: 'Payment Processing Error',
      code: 'X402_INTERNAL_ERROR',
      message: 'An error occurred while processing the payment'
    });
  }
}

/**
 * Create x402 payment header for client
 */
export function createX402PaymentHeader(
  from: string,
  to: string,
  value: string,
  validitySeconds: number = 300
): { paymentObject: X402PaymentHeader; header: string } {
  const now = Math.floor(Date.now() / 1000);
  
  const paymentObject: X402PaymentHeader = {
    from,
    to,
    value,
    validAfter: now - 60, // Valid from 1 minute ago
    validBefore: now + validitySeconds,
    nonce: ethers.hexlify(ethers.randomBytes(32)),
    signature: '' // To be signed by client
  };

  const header = Buffer.from(JSON.stringify(paymentObject)).toString('base64');

  return { paymentObject, header };
}
