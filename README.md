# 🚀 NEXUS-402

## The Universal x402 Orchestration Protocol & Agent Marketplace for Cronos

[![Cronos](https://img.shields.io/badge/Cronos-002D74?style=for-the-badge&logo=cronos&logoColor=white)](https://cronos.org)
[![x402](https://img.shields.io/badge/x402-Protocol-00A3FF?style=for-the-badge)](https://github.com/coinbase/x402)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)

---

<p align="center">
  <strong>Connect AI Agents • Automate Workflows • Process Crypto Payments</strong>
</p>

<p align="center">
  Built for the <a href="https://cronos.org">Cronos x402 Paytech Hackathon</a> 🏆
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Smart Contracts](#-smart-contracts)
- [SDK Usage](#-sdk-usage)
- [CLI Tool](#-cli-tool)
- [MCP Server](#-mcp-server)
- [Demo Agents](#-demo-agents)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🌟 Overview

**NEXUS-402** is a comprehensive protocol that serves as the universal orchestration layer for AI agents on Cronos, powered by the x402 payment standard. It enables:

- **AI Agent Discovery & Registration** - A decentralized registry for AI agents
- **Multi-Step Workflow Automation** - Chain agent calls with conditional logic
- **Gasless x402 Payments** - USDC payments with EIP-3009 authorization
- **Agent Marketplace** - Discover and purchase AI agent services
- **Developer Tooling** - SDK, CLI, and MCP server for seamless integration

### Why NEXUS-402?

| Problem | Solution |
|---------|----------|
| Fragmented AI agent ecosystem | Unified registry with discovery |
| Complex multi-agent coordination | Visual workflow builder with conditional logic |
| Gas costs for payments | Gasless x402 (EIP-3009) USDC transfers |
| No monetization for AI agents | Built-in marketplace with revenue splitting |
| Hard to integrate for developers | TypeScript SDK, CLI, and MCP server |

---

## ✨ Features

### 🤖 Agent Registry
- Register AI agents with capabilities, pricing, and payment addresses
- Discover agents by capability, rating, or revenue
- On-chain reputation and rating system
- Automatic payment routing to agent owners

### ⚡ Workflow Engine
- Create multi-step workflows chaining multiple agents
- Conditional branching based on step outputs
- Parallel and sequential execution modes
- Automatic payment aggregation for workflows

### 💸 Payment Router
- **Simple Payments** - One-time x402 USDC transfers
- **Payment Splitting** - Multi-recipient distributions
- **Streaming Payments** - Time-based continuous payments
- **Recurring Payments** - Automated scheduled payments
- **Escrow** - Conditional release based on delivery

### 🏪 Marketplace
- List AI agent services with pricing
- Category-based discovery
- Order management with escrow
- Rating and review system

### 🛠 Developer Tools
- **TypeScript SDK** - Full-featured client library
- **CLI Tool** - Command-line interface for all operations
- **MCP Server** - Model Context Protocol for AI assistants
- **REST API** - Complete HTTP API

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NEXUS-402 Protocol                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Agent     │  │  Workflow   │  │  Payment    │  │ Marketplace│ │
│  │  Registry   │  │   Engine    │  │   Router    │  │            │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │               │         │
│         └────────────────┼────────────────┼───────────────┘         │
│                          │                │                         │
│                    ┌─────┴────────────────┴─────┐                   │
│                    │     Smart Contracts        │                   │
│                    │      (Cronos EVM)          │                   │
│                    └────────────────────────────┘                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Backend    │  │  Frontend   │  │     SDK     │  │    CLI     │ │
│  │   API       │  │  Dashboard  │  │             │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐  │
│  │ MCP Server  │  │              Demo Agents                     │  │
│  │             │  │  DeFi Strategist | Payment Proc | Oracle    │  │
│  └─────────────┘  └─────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
nexus-402/
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── NexusRegistry.sol      # Agent registry
│   │   ├── WorkflowEngine.sol     # Workflow execution
│   │   ├── PaymentRouter.sol      # x402 payments
│   │   └── AgentMarketplace.sol   # Marketplace
│   └── scripts/
│       └── deploy.ts              # Deployment script
│
├── apps/
│   ├── backend/            # Express.js API server
│   ├── frontend/           # Next.js dashboard
│   └── demo-agents/        # Demo AI agents
│
├── packages/
│   ├── sdk/                # TypeScript SDK
│   ├── cli/                # Command-line tool
│   └── mcp-server/         # MCP server for AI
│
└── docs/                   # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Cronos testnet wallet with TCRO

### Installation

```bash
# Clone the repository
git clone https://github.com/nexus-402/nexus-402.git
cd nexus-402

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build all packages
pnpm build
```

### Running Locally

```bash
# Start the backend API
pnpm --filter @nexus-402/backend dev

# Start the frontend (in another terminal)
pnpm --filter @nexus-402/frontend dev

# Start demo agents (in another terminal)
pnpm --filter @nexus-402/demo-agents dev
```

### Environment Variables

```env
# Cronos Network
CRONOS_RPC_URL=https://evm-t3.cronos.org
CHAIN_ID=338

# Wallet
PRIVATE_KEY=your_private_key_here

# Tokens
USDC_ADDRESS=0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a

# API
PORT=3001
NEXUS_API_URL=http://localhost:3001

# Frontend
NEXT_PUBLIC_WALLET_CONNECT_ID=your_project_id
```

---

## 📜 Smart Contracts

### NexusRegistry

The core registry for AI agents:

```solidity
// Register an agent
function registerAgent(
    string memory name,
    string[] memory capabilities,
    uint256 pricePerCall,
    address paymentAddress
) external returns (bytes32 agentId);

// Call an agent with x402 payment
function callAgent(
    bytes32 agentId,
    bytes calldata input,
    bytes calldata x402Authorization
) external returns (bytes32 callId);
```

### PaymentRouter

x402-enabled payment processing:

```solidity
// Simple x402 payment
function executeX402Payment(
    address from,
    address to,
    uint256 amount,
    bytes calldata authorization  // EIP-3009 signature
) external returns (bytes32 paymentId);

// Create streaming payment
function createStream(
    address recipient,
    uint256 totalAmount,
    uint256 duration
) external returns (bytes32 streamId);
```

---

## 📦 SDK Usage

### Installation

```bash
npm install @nexus-402/sdk
```

### Basic Usage

```typescript
import { NexusClient } from '@nexus-402/sdk';

// Initialize client
const nexus = new NexusClient({
  apiUrl: 'http://localhost:3001',
  rpcUrl: 'https://evm-t3.cronos.org',
  chainId: 338
});

// List all agents
const agents = await nexus.agents.list({ capability: 'defi' });

// Call an agent
const result = await nexus.agents.call('agent-id', {
  action: 'analyzePortfolio',
  params: { address: '0x...' }
});

// Create a workflow
const workflow = await nexus.workflows.create({
  name: 'DeFi Analytics',
  steps: [
    { agentId: 'price-oracle', action: 'getPrice', params: { token: 'CRO' } },
    { agentId: 'defi-strategist', action: 'generateStrategy', params: { amount: 1000 } }
  ]
});
```

---

## 💻 CLI Tool

```bash
# Install globally
npm install -g @nexus-402/cli

# Agent commands
nexus agents list
nexus agents call <agent-id>

# Workflow commands
nexus workflows list
nexus workflows execute <id>

# Payment commands
nexus payments x402

# Analytics
nexus analytics overview
```

---

## 🔌 MCP Server

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "nexus-402": {
      "command": "npx",
      "args": ["@nexus-402/mcp-server"]
    }
  }
}
```

---

## 🤖 Demo Agents

- **DeFi Strategist** (Port 4001) - Investment strategies
- **Payment Processor** (Port 4002) - Invoice & payment automation
- **Price Oracle** (Port 4003) - Token prices & market data

```bash
pnpm --filter @nexus-402/demo-agents dev
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List agents |
| `/api/agents/:id/call` | POST | Call agent |
| `/api/workflows` | GET/POST | Manage workflows |
| `/api/payments/x402` | POST | Create x402 payment |
| `/api/marketplace/listings` | GET | Browse marketplace |
| `/api/analytics/overview` | GET | Protocol stats |

---

## 🏆 Hackathon Tracks

NEXUS-402 targets **ALL tracks**:

- 🥇 **Main Track** ($24,000) - Complete protocol
- 💰 **Best Agentic Finance** ($5,000) - AI + DeFi automation
- 🔗 **Best Ecosystem Integration** ($3,000) - Cronos + x402
- 🛠 **Best Developer Tooling** ($3,000) - SDK, CLI, MCP

---

## 📄 License

MIT License

---

<p align="center">
  Built with ❤️ for the Cronos x402 Paytech Hackathon
</p>