/**
 * NEXUS-402 SDK
 * 
 * TypeScript SDK for integrating with the NEXUS-402 Protocol on Cronos.
 * Provides easy-to-use interfaces for:
 * - Agent Registry (registration, discovery, calling)
 * - Workflow Engine (creation, execution, monitoring)
 * - Payment Router (x402 payments, streaming, splits)
 * - Marketplace (listings, orders)
 * 
 * @example
 * ```typescript
 * import { NexusClient } from '@nexus-402/sdk';
 * 
 * const client = new NexusClient({
 *   rpcUrl: 'https://evm-t3.cronos.org',
 *   apiUrl: 'http://localhost:3001'
 * });
 * 
 * // Register an agent
 * const agent = await client.agents.register({
 *   name: 'My AI Agent',
 *   capabilities: ['payments', 'analytics'],
 *   pricePerCall: '100000'
 * });
 * 
 * // Create a workflow
 * const workflow = await client.workflows.create({
 *   name: 'My Workflow',
 *   steps: [...]
 * });
 * 
 * // Process x402 payment
 * const payment = await client.payments.createX402({
 *   to: '0x...',
 *   amount: '1000000'
 * });
 * ```
 */

import { ethers } from 'ethers';

// ========== Types ==========

export interface NexusConfig {
  /** Cronos RPC URL */
  rpcUrl?: string;
  /** NEXUS-402 API URL */
  apiUrl?: string;
  /** Private key for signing transactions */
  privateKey?: string;
  /** Signer instance */
  signer?: ethers.Signer;
  /** Chain ID (default: 338 for Cronos Testnet) */
  chainId?: number;
  /** Contract addresses */
  contracts?: {
    registry?: string;
    workflowEngine?: string;
    paymentRouter?: string;
    marketplace?: string;
  };
}

export interface Agent {
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

export interface AgentCallResult {
  agentId: string;
  callId: string;
  timestamp: string;
  input: any;
  output: any;
  payment: {
    amount: string;
    currency: string;
    status: string;
  };
}

export interface WorkflowStep {
  id: string;
  type: 'CALL_AGENT' | 'TRANSFER' | 'SWAP' | 'CONDITION' | 'PARALLEL' | 'DELAY' | 'CUSTOM';
  config: Record<string, any>;
  nextOnSuccess?: string;
  nextOnFailure?: string;
}

export interface Workflow {
  id: string;
  owner: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isActive: boolean;
  totalExecutions: number;
  successfulExecutions: number;
  createdAt: string;
  lastExecutedAt: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  executor: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep: string | null;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    output: any;
    timestamp: string;
  }>;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface Payment {
  id: string;
  type: 'SIMPLE' | 'SPLIT' | 'STREAMING' | 'CONDITIONAL' | 'RECURRING';
  payer: string;
  totalAmount: string;
  releasedAmount: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, any>;
}

export interface X402PaymentParams {
  from?: string;
  to: string;
  amount: string;
  validitySeconds?: number;
}

export interface X402Payment {
  paymentObject: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
  };
  encoding: string;
  signature?: string;
}

export interface ServiceListing {
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

export interface Order {
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

// ========== API Client ==========

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

// ========== Agent Registry ==========

export class AgentRegistry {
  private api: ApiClient;
  private signer?: ethers.Signer;

  constructor(api: ApiClient, signer?: ethers.Signer) {
    this.api = api;
    this.signer = signer;
  }

  /**
   * List all registered agents
   */
  async list(options?: {
    capability?: string;
    active?: boolean;
    sort?: 'rating' | 'calls' | 'revenue';
    limit?: number;
    offset?: number;
  }): Promise<{ agents: Agent[]; pagination: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    if (options?.capability) params.set('capability', options.capability);
    if (options?.active !== undefined) params.set('active', String(options.active));
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    return this.api.get(`/api/agents?${params}`);
  }

  /**
   * Get agent by ID
   */
  async get(agentId: string): Promise<{ agent: Agent }> {
    return this.api.get(`/api/agents/${agentId}`);
  }

  /**
   * Register a new agent
   */
  async register(params: {
    name: string;
    description?: string;
    capabilities: string[];
    pricePerCall: string;
    paymentAddress?: string;
  }): Promise<{ agent: Agent }> {
    if (!this.signer) {
      throw new Error('Signer required to register agent');
    }

    const owner = await this.signer.getAddress();
    const paymentAddress = params.paymentAddress || owner;

    return this.api.post('/api/agents', {
      ...params,
      owner,
      paymentAddress
    });
  }

  /**
   * Call an agent
   */
  async call(agentId: string, input?: any): Promise<AgentCallResult> {
    return this.api.post(`/api/agents/${agentId}/call`, input);
  }

  /**
   * Rate an agent
   */
  async rate(agentId: string, rating: 1 | 2 | 3 | 4 | 5): Promise<{ newRating: number; totalRatings: number }> {
    return this.api.post(`/api/agents/${agentId}/rate`, { rating });
  }

  /**
   * Get all available capabilities
   */
  async getCapabilities(): Promise<{ capabilities: string[] }> {
    return this.api.get('/api/agents/meta/capabilities');
  }
}

// ========== Workflow Engine ==========

export class WorkflowEngine {
  private api: ApiClient;
  private signer?: ethers.Signer;

  constructor(api: ApiClient, signer?: ethers.Signer) {
    this.api = api;
    this.signer = signer;
  }

  /**
   * List all workflows
   */
  async list(options?: {
    owner?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ workflows: Workflow[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.owner) params.set('owner', options.owner);
    if (options?.active !== undefined) params.set('active', String(options.active));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    return this.api.get(`/api/workflows?${params}`);
  }

  /**
   * Get workflow by ID
   */
  async get(workflowId: string): Promise<{ workflow: Workflow }> {
    return this.api.get(`/api/workflows/${workflowId}`);
  }

  /**
   * Create a new workflow
   */
  async create(params: {
    name: string;
    description?: string;
    steps: WorkflowStep[];
  }): Promise<{ workflow: Workflow }> {
    if (!this.signer) {
      throw new Error('Signer required to create workflow');
    }

    const owner = await this.signer.getAddress();

    return this.api.post('/api/workflows', {
      ...params,
      owner
    });
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId: string, inputs?: any): Promise<{
    executionId: string;
    status: string;
    checkStatusUrl: string;
  }> {
    const executor = this.signer ? await this.signer.getAddress() : undefined;

    return this.api.post(`/api/workflows/${workflowId}/execute`, {
      executor,
      inputs
    });
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<{ execution: WorkflowExecution }> {
    return this.api.get(`/api/workflows/executions/${executionId}`);
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit?: number): Promise<{ executions: WorkflowExecution[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.api.get(`/api/workflows/${workflowId}/executions${params}`);
  }

  /**
   * Get workflow templates
   */
  async getTemplates(): Promise<{ templates: any[] }> {
    return this.api.get('/api/workflows/meta/templates');
  }

  /**
   * Update a workflow
   */
  async update(workflowId: string, updates: Partial<{
    name: string;
    description: string;
    steps: WorkflowStep[];
    isActive: boolean;
  }>): Promise<{ workflow: Workflow }> {
    return this.api.put(`/api/workflows/${workflowId}`, updates);
  }

  /**
   * Deactivate a workflow
   */
  async deactivate(workflowId: string): Promise<{ message: string }> {
    return this.api.delete(`/api/workflows/${workflowId}`);
  }
}

// ========== Payment Router ==========

export class PaymentRouter {
  private api: ApiClient;
  private signer?: ethers.Signer;
  private chainId: number;

  constructor(api: ApiClient, signer?: ethers.Signer, chainId: number = 338) {
    this.api = api;
    this.signer = signer;
    this.chainId = chainId;
  }

  /**
   * List payments
   */
  async list(options?: {
    payer?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.payer) params.set('payer', options.payer);
    if (options?.type) params.set('type', options.type);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    return this.api.get(`/api/payments?${params}`);
  }

  /**
   * Get payment by ID
   */
  async get(paymentId: string): Promise<{ payment: Payment }> {
    return this.api.get(`/api/payments/${paymentId}`);
  }

  /**
   * Create a simple transfer payment
   */
  async createSimple(params: {
    recipient: string;
    amount: string;
  }): Promise<{ payment: Payment }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const payer = await this.signer.getAddress();

    return this.api.post('/api/payments/simple', {
      payer,
      ...params
    });
  }

  /**
   * Create a split payment
   */
  async createSplit(params: {
    recipients: Array<{ address: string; basisPoints: number }>;
    totalAmount: string;
  }): Promise<{ payment: Payment }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const payer = await this.signer.getAddress();

    return this.api.post('/api/payments/split', {
      payer,
      ...params
    });
  }

  /**
   * Create a streaming payment
   */
  async createStreaming(params: {
    recipient: string;
    totalAmount: string;
    durationSeconds: number;
  }): Promise<{ payment: Payment }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const payer = await this.signer.getAddress();

    return this.api.post('/api/payments/streaming', {
      payer,
      ...params
    });
  }

  /**
   * Create a recurring payment
   */
  async createRecurring(params: {
    recipient: string;
    amount: string;
    intervalSeconds: number;
    totalPayments: number;
  }): Promise<{ payment: Payment }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const payer = await this.signer.getAddress();

    return this.api.post('/api/payments/recurring', {
      payer,
      ...params
    });
  }

  /**
   * Create an x402 payment authorization
   */
  async createX402(params: X402PaymentParams): Promise<X402Payment> {
    const from = params.from || (this.signer ? await this.signer.getAddress() : undefined);
    
    if (!from) {
      throw new Error('From address required');
    }

    const response = await this.api.post<any>('/api/payments/x402', {
      from,
      to: params.to,
      amount: params.amount,
      validitySeconds: params.validitySeconds || 300
    });

    return response;
  }

  /**
   * Sign an x402 payment (EIP-712)
   */
  async signX402(payment: X402Payment): Promise<X402Payment> {
    if (!this.signer) {
      throw new Error('Signer required to sign payment');
    }

    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: this.chainId,
      verifyingContract: '0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a' // USDC.e on Cronos Testnet
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

    const signature = await (this.signer as any).signTypedData(domain, types, payment.paymentObject);

    return {
      ...payment,
      signature
    };
  }

  /**
   * Claim from a streaming payment
   */
  async claimStreaming(paymentId: string): Promise<{ claimed: string; totalClaimed: string }> {
    return this.api.post(`/api/payments/${paymentId}/claim`);
  }

  /**
   * Execute a recurring payment
   */
  async executeRecurring(paymentId: string): Promise<{ amountPaid: string; paymentNumber: number }> {
    return this.api.post(`/api/payments/${paymentId}/execute`);
  }

  /**
   * Cancel a payment
   */
  async cancel(paymentId: string): Promise<{ refundAmount: string }> {
    return this.api.post(`/api/payments/${paymentId}/cancel`);
  }

  /**
   * Get payment statistics
   */
  async getStats(): Promise<any> {
    return this.api.get('/api/payments/meta/stats');
  }
}

// ========== Marketplace ==========

export class Marketplace {
  private api: ApiClient;
  private signer?: ethers.Signer;

  constructor(api: ApiClient, signer?: ethers.Signer) {
    this.api = api;
    this.signer = signer;
  }

  /**
   * List all service listings
   */
  async listServices(options?: {
    category?: string;
    provider?: string;
    active?: boolean;
    sort?: 'rating' | 'sales' | 'price-low' | 'price-high';
    limit?: number;
    offset?: number;
  }): Promise<{ listings: ServiceListing[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.provider) params.set('provider', options.provider);
    if (options?.active !== undefined) params.set('active', String(options.active));
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    return this.api.get(`/api/marketplace/listings?${params}`);
  }

  /**
   * Get service listing by ID
   */
  async getService(listingId: string): Promise<{ listing: ServiceListing }> {
    return this.api.get(`/api/marketplace/listings/${listingId}`);
  }

  /**
   * Create a service listing
   */
  async createListing(params: {
    agentId: string;
    name: string;
    description?: string;
    category: string;
    pricePerUnit: string;
    minUnits?: number;
    maxUnits?: number;
  }): Promise<{ listing: ServiceListing }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const provider = await this.signer.getAddress();

    return this.api.post('/api/marketplace/listings', {
      provider,
      ...params
    });
  }

  /**
   * Create an order
   */
  async createOrder(params: {
    listingId: string;
    units: number;
  }): Promise<{ order: Order; payment: any }> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const buyer = await this.signer.getAddress();

    return this.api.post('/api/marketplace/orders', {
      buyer,
      ...params
    });
  }

  /**
   * List orders
   */
  async listOrders(options?: {
    buyer?: string;
    listingId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.buyer) params.set('buyer', options.buyer);
    if (options?.listingId) params.set('listingId', options.listingId);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    return this.api.get(`/api/marketplace/orders?${params}`);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<{ order: Order; listing: ServiceListing }> {
    return this.api.get(`/api/marketplace/orders/${orderId}`);
  }

  /**
   * Accept an order (provider)
   */
  async acceptOrder(orderId: string): Promise<{ order: Order }> {
    return this.api.post(`/api/marketplace/orders/${orderId}/accept`);
  }

  /**
   * Deliver an order (provider)
   */
  async deliverOrder(orderId: string, deliveryData: string): Promise<{ order: Order }> {
    return this.api.post(`/api/marketplace/orders/${orderId}/deliver`, { deliveryData });
  }

  /**
   * Complete an order (buyer)
   */
  async completeOrder(orderId: string, rating?: 1 | 2 | 3 | 4 | 5): Promise<{ order: Order }> {
    return this.api.post(`/api/marketplace/orders/${orderId}/complete`, { rating });
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<{ categories: Array<{ name: string; listingCount: number }> }> {
    return this.api.get('/api/marketplace/categories');
  }

  /**
   * Get marketplace statistics
   */
  async getStats(): Promise<any> {
    return this.api.get('/api/marketplace/stats');
  }
}

// ========== Analytics ==========

export class Analytics {
  private api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  /**
   * Get protocol overview
   */
  async getOverview(): Promise<any> {
    return this.api.get('/api/analytics/overview');
  }

  /**
   * Get agent analytics
   */
  async getAgentAnalytics(): Promise<any> {
    return this.api.get('/api/analytics/agents');
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(): Promise<any> {
    return this.api.get('/api/analytics/workflows');
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(): Promise<any> {
    return this.api.get('/api/analytics/payments');
  }

  /**
   * Get marketplace analytics
   */
  async getMarketplaceAnalytics(): Promise<any> {
    return this.api.get('/api/analytics/marketplace');
  }

  /**
   * Get network analytics
   */
  async getNetworkAnalytics(): Promise<any> {
    return this.api.get('/api/analytics/network');
  }

  /**
   * Get agent leaderboard
   */
  async getLeaderboard(options?: { metric?: 'calls' | 'revenue' | 'rating'; limit?: number }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.metric) params.set('metric', options.metric);
    if (options?.limit) params.set('limit', String(options.limit));
    
    return this.api.get(`/api/analytics/leaderboard?${params}`);
  }

  /**
   * Get real-time stats
   */
  async getRealtime(): Promise<any> {
    return this.api.get('/api/analytics/realtime');
  }
}

// ========== Main Client ==========

export class NexusClient {
  public readonly agents: AgentRegistry;
  public readonly workflows: WorkflowEngine;
  public readonly payments: PaymentRouter;
  public readonly marketplace: Marketplace;
  public readonly analytics: Analytics;

  private provider?: ethers.Provider;
  private signer?: ethers.Signer;
  private config: NexusConfig;

  constructor(config: NexusConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || 'https://evm-t3.cronos.org',
      apiUrl: config.apiUrl || 'http://localhost:3001',
      chainId: config.chainId || 338,
      ...config
    };

    // Set up provider
    if (this.config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    }

    // Set up signer
    if (config.signer) {
      this.signer = config.signer;
    } else if (config.privateKey && this.provider) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Initialize API client
    const api = new ApiClient(this.config.apiUrl!);

    // Initialize modules
    this.agents = new AgentRegistry(api, this.signer);
    this.workflows = new WorkflowEngine(api, this.signer);
    this.payments = new PaymentRouter(api, this.signer, this.config.chainId);
    this.marketplace = new Marketplace(api, this.signer);
    this.analytics = new Analytics(api);
  }

  /**
   * Get the current signer address
   */
  async getAddress(): Promise<string | undefined> {
    return this.signer?.getAddress();
  }

  /**
   * Get the provider
   */
  getProvider(): ethers.Provider | undefined {
    return this.provider;
  }

  /**
   * Get the signer
   */
  getSigner(): ethers.Signer | undefined {
    return this.signer;
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const api = new ApiClient(this.config.apiUrl!);
    return api.get('/health');
  }
}

// Export default
export default NexusClient;
