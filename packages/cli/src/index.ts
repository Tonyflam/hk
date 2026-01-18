#!/usr/bin/env node

/**
 * NEXUS-402 CLI
 * 
 * Command-line interface for interacting with the NEXUS-402 Protocol on Cronos.
 * 
 * Usage:
 *   nexus agents list                     # List all agents
 *   nexus agents register                 # Register a new agent
 *   nexus agents call <id>                # Call an agent
 *   nexus workflows list                  # List all workflows
 *   nexus workflows create                # Create a new workflow
 *   nexus workflows execute <id>          # Execute a workflow
 *   nexus payments create                 # Create a payment
 *   nexus payments x402                   # Create x402 payment
 *   nexus marketplace list                # List marketplace services
 *   nexus analytics overview              # Protocol analytics
 *   nexus config                          # Configure CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import inquirer from 'inquirer';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const program = new Command();

// Configuration
const config = {
  apiUrl: process.env.NEXUS_API_URL || 'http://localhost:3001',
  rpcUrl: process.env.CRONOS_RPC_URL || 'https://evm-t3.cronos.org',
  privateKey: process.env.PRIVATE_KEY || '',
  chainId: parseInt(process.env.CHAIN_ID || '338')
};

// API helper
async function api(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }
  
  return response.json();
}

// Formatting helpers
function formatUSDC(amount: string): string {
  return `$${(parseFloat(amount) / 1e6).toFixed(2)}`;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatRating(rating: number): string {
  const stars = '★'.repeat(Math.floor(rating / 100));
  const empty = '☆'.repeat(5 - Math.floor(rating / 100));
  return `${stars}${empty} (${(rating / 100).toFixed(1)})`;
}

// ========== Program Setup ==========

program
  .name('nexus')
  .description(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NEXUS-402 CLI                                        ║
║                                                           ║
║   Universal x402 Orchestration Protocol                   ║
║   & Agent Marketplace for Cronos                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `))
  .version('1.0.0');

// ========== Agents Commands ==========

const agents = program.command('agents').description('Manage AI agents');

agents
  .command('list')
  .description('List all registered agents')
  .option('-c, --capability <cap>', 'Filter by capability')
  .option('-s, --sort <field>', 'Sort by: rating, calls, revenue')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching agents...').start();
    
    try {
      const params = new URLSearchParams();
      if (options.capability) params.set('capability', options.capability);
      if (options.sort) params.set('sort', options.sort);
      if (options.limit) params.set('limit', options.limit);
      
      const result = await api(`/api/agents?${params}`);
      spinner.stop();
      
      if (result.agents.length === 0) {
        console.log(chalk.yellow('No agents found.'));
        return;
      }
      
      const data = [
        [
          chalk.bold('ID'),
          chalk.bold('Name'),
          chalk.bold('Capabilities'),
          chalk.bold('Price'),
          chalk.bold('Calls'),
          chalk.bold('Rating')
        ],
        ...result.agents.map((a: any) => [
          chalk.cyan(a.id.slice(0, 20)),
          a.name,
          a.capabilities.slice(0, 2).join(', '),
          formatUSDC(a.pricePerCall),
          a.totalCalls.toLocaleString(),
          formatRating(a.rating)
        ])
      ];
      
      console.log(table(data));
      console.log(chalk.gray(`Showing ${result.agents.length} of ${result.pagination.total} agents`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

agents
  .command('get <id>')
  .description('Get agent details')
  .action(async (id) => {
    const spinner = ora('Fetching agent...').start();
    
    try {
      const result = await api(`/api/agents/${id}`);
      spinner.stop();
      
      const agent = result.agent;
      
      console.log(chalk.bold.cyan(`\n${agent.name}`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('ID:')}           ${agent.id}`);
      console.log(`${chalk.bold('Owner:')}        ${formatAddress(agent.owner)}`);
      console.log(`${chalk.bold('Description:')}  ${agent.description || 'N/A'}`);
      console.log(`${chalk.bold('Capabilities:')} ${agent.capabilities.join(', ')}`);
      console.log(`${chalk.bold('Price:')}        ${formatUSDC(agent.pricePerCall)} per call`);
      console.log(`${chalk.bold('Total Calls:')} ${agent.totalCalls.toLocaleString()}`);
      console.log(`${chalk.bold('Revenue:')}      ${formatUSDC(agent.totalRevenue)}`);
      console.log(`${chalk.bold('Rating:')}       ${formatRating(agent.rating)} (${agent.ratingCount} reviews)`);
      console.log(`${chalk.bold('Status:')}       ${agent.isActive ? chalk.green('Active') : chalk.red('Inactive')}`);
      console.log(`${chalk.bold('Created:')}      ${new Date(agent.createdAt).toLocaleString()}`);
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

agents
  .command('register')
  .description('Register a new agent')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: (v: string) => v.length > 0 || 'Name is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:'
        },
        {
          type: 'checkbox',
          name: 'capabilities',
          message: 'Select capabilities:',
          choices: ['defi', 'payments', 'analytics', 'trading', 'data-oracle', 'automation', 'security', 'rwa'],
          validate: (v: string[]) => v.length > 0 || 'Select at least one capability'
        },
        {
          type: 'input',
          name: 'pricePerCall',
          message: 'Price per call (USDC):',
          default: '0.1',
          filter: (v: string) => (parseFloat(v) * 1e6).toString()
        },
        {
          type: 'input',
          name: 'paymentAddress',
          message: 'Payment address:',
          validate: (v: string) => ethers.isAddress(v) || 'Invalid address'
        }
      ]);
      
      const spinner = ora('Registering agent...').start();
      
      const result = await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          ...answers,
          owner: answers.paymentAddress
        })
      });
      
      spinner.succeed(chalk.green('Agent registered successfully!'));
      console.log(chalk.cyan(`Agent ID: ${result.agent.id}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

agents
  .command('call <id>')
  .description('Call an agent')
  .option('-i, --input <json>', 'Input data (JSON)')
  .action(async (id, options) => {
    const spinner = ora('Calling agent...').start();
    
    try {
      const input = options.input ? JSON.parse(options.input) : {};
      
      const result = await api(`/api/agents/${id}/call`, {
        method: 'POST',
        body: JSON.stringify(input)
      });
      
      spinner.succeed(chalk.green('Agent call successful!'));
      console.log(chalk.bold('\nResponse:'));
      console.log(JSON.stringify(result.output, null, 2));
      console.log(chalk.gray(`\nPayment: ${formatUSDC(result.payment.amount)}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ========== Workflows Commands ==========

const workflows = program.command('workflows').description('Manage workflows');

workflows
  .command('list')
  .description('List all workflows')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching workflows...').start();
    
    try {
      const result = await api(`/api/workflows?limit=${options.limit}`);
      spinner.stop();
      
      if (result.workflows.length === 0) {
        console.log(chalk.yellow('No workflows found.'));
        return;
      }
      
      const data = [
        [
          chalk.bold('ID'),
          chalk.bold('Name'),
          chalk.bold('Steps'),
          chalk.bold('Executions'),
          chalk.bold('Success Rate'),
          chalk.bold('Status')
        ],
        ...result.workflows.map((w: any) => [
          chalk.cyan(w.id.slice(0, 20)),
          w.name,
          w.steps.length.toString(),
          w.totalExecutions.toString(),
          `${((w.successfulExecutions / Math.max(w.totalExecutions, 1)) * 100).toFixed(1)}%`,
          w.isActive ? chalk.green('Active') : chalk.red('Inactive')
        ])
      ];
      
      console.log(table(data));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

workflows
  .command('execute <id>')
  .description('Execute a workflow')
  .action(async (id) => {
    const spinner = ora('Executing workflow...').start();
    
    try {
      const result = await api(`/api/workflows/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      spinner.succeed(chalk.green('Workflow execution started!'));
      console.log(chalk.cyan(`Execution ID: ${result.executionId}`));
      console.log(chalk.gray(`Status: ${result.status}`));
      console.log(chalk.gray(`Check status: nexus workflows status ${result.executionId}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

workflows
  .command('status <executionId>')
  .description('Get workflow execution status')
  .action(async (executionId) => {
    const spinner = ora('Fetching execution status...').start();
    
    try {
      const result = await api(`/api/workflows/executions/${executionId}`);
      spinner.stop();
      
      const exec = result.execution;
      
      console.log(chalk.bold.cyan(`\nExecution: ${exec.id}`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Workflow:')}    ${exec.workflowId}`);
      console.log(`${chalk.bold('Status:')}      ${
        exec.status === 'COMPLETED' ? chalk.green(exec.status) :
        exec.status === 'FAILED' ? chalk.red(exec.status) :
        chalk.yellow(exec.status)
      }`);
      console.log(`${chalk.bold('Started:')}     ${new Date(exec.startedAt).toLocaleString()}`);
      if (exec.completedAt) {
        console.log(`${chalk.bold('Completed:')}   ${new Date(exec.completedAt).toLocaleString()}`);
      }
      if (exec.error) {
        console.log(`${chalk.bold('Error:')}       ${chalk.red(exec.error)}`);
      }
      
      if (exec.stepResults.length > 0) {
        console.log(chalk.bold('\nStep Results:'));
        exec.stepResults.forEach((step: any, i: number) => {
          const icon = step.success ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${icon} Step ${i + 1}: ${step.stepId}`);
        });
      }
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ========== Payments Commands ==========

const payments = program.command('payments').description('Manage payments');

payments
  .command('list')
  .description('List payments')
  .option('-t, --type <type>', 'Filter by type')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching payments...').start();
    
    try {
      const params = new URLSearchParams();
      if (options.type) params.set('type', options.type);
      if (options.limit) params.set('limit', options.limit);
      
      const result = await api(`/api/payments?${params}`);
      spinner.stop();
      
      if (result.payments.length === 0) {
        console.log(chalk.yellow('No payments found.'));
        return;
      }
      
      const data = [
        [
          chalk.bold('ID'),
          chalk.bold('Type'),
          chalk.bold('Amount'),
          chalk.bold('Released'),
          chalk.bold('Status'),
          chalk.bold('Created')
        ],
        ...result.payments.map((p: any) => [
          chalk.cyan(p.id),
          p.type,
          formatUSDC(p.totalAmount),
          formatUSDC(p.releasedAmount),
          p.status === 'COMPLETED' ? chalk.green(p.status) :
          p.status === 'ACTIVE' ? chalk.yellow(p.status) :
          p.status,
          new Date(p.createdAt).toLocaleDateString()
        ])
      ];
      
      console.log(table(data));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

payments
  .command('x402')
  .description('Create x402 payment authorization')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'from',
          message: 'From address:',
          validate: (v: string) => ethers.isAddress(v) || 'Invalid address'
        },
        {
          type: 'input',
          name: 'to',
          message: 'To address:',
          validate: (v: string) => ethers.isAddress(v) || 'Invalid address'
        },
        {
          type: 'input',
          name: 'amount',
          message: 'Amount (USDC):',
          filter: (v: string) => (parseFloat(v) * 1e6).toString()
        }
      ]);
      
      const spinner = ora('Creating x402 payment...').start();
      
      const result = await api('/api/payments/x402', {
        method: 'POST',
        body: JSON.stringify(answers)
      });
      
      spinner.succeed(chalk.green('x402 payment authorization created!'));
      console.log(chalk.bold('\nPayment Object:'));
      console.log(JSON.stringify(result.paymentObject, null, 2));
      console.log(chalk.bold('\nBase64 Header:'));
      console.log(chalk.cyan(result.encoding));
      console.log(chalk.gray('\nSign this with your wallet and include in X-Payment-Authorization header.'));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

payments
  .command('stats')
  .description('Get payment statistics')
  .action(async () => {
    const spinner = ora('Fetching stats...').start();
    
    try {
      const result = await api('/api/payments/meta/stats');
      spinner.stop();
      
      console.log(chalk.bold.cyan('\nPayment Statistics'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Total Payments:')}    ${result.stats.total}`);
      console.log(`${chalk.bold('Total Volume:')}      ${formatUSDC(result.stats.totalVolume)}`);
      console.log(`${chalk.bold('Total Released:')}    ${formatUSDC(result.stats.totalReleased)}`);
      console.log(chalk.bold('\nBy Type:'));
      Object.entries(result.stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ========== Marketplace Commands ==========

const marketplace = program.command('marketplace').description('Browse marketplace');

marketplace
  .command('list')
  .description('List marketplace services')
  .option('-c, --category <cat>', 'Filter by category')
  .option('-s, --sort <field>', 'Sort by: rating, sales, price-low, price-high')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching listings...').start();
    
    try {
      const params = new URLSearchParams();
      if (options.category) params.set('category', options.category);
      if (options.sort) params.set('sort', options.sort);
      if (options.limit) params.set('limit', options.limit);
      
      const result = await api(`/api/marketplace/listings?${params}`);
      spinner.stop();
      
      if (result.listings.length === 0) {
        console.log(chalk.yellow('No listings found.'));
        return;
      }
      
      const data = [
        [
          chalk.bold('Name'),
          chalk.bold('Category'),
          chalk.bold('Price'),
          chalk.bold('Sales'),
          chalk.bold('Rating')
        ],
        ...result.listings.map((l: any) => [
          l.name.slice(0, 30),
          l.category,
          formatUSDC(l.pricePerUnit),
          l.totalSales.toLocaleString(),
          formatRating(l.rating)
        ])
      ];
      
      console.log(table(data));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

marketplace
  .command('categories')
  .description('List all categories')
  .action(async () => {
    const spinner = ora('Fetching categories...').start();
    
    try {
      const result = await api('/api/marketplace/categories');
      spinner.stop();
      
      console.log(chalk.bold.cyan('\nMarketplace Categories'));
      console.log(chalk.gray('─'.repeat(50)));
      result.categories.forEach((cat: any) => {
        console.log(`  ${cat.name}: ${cat.listingCount} listings (${cat.activeListings} active)`);
      });
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ========== Analytics Commands ==========

const analytics = program.command('analytics').description('Protocol analytics');

analytics
  .command('overview')
  .description('Protocol overview')
  .action(async () => {
    const spinner = ora('Fetching analytics...').start();
    
    try {
      const result = await api('/api/analytics/overview');
      spinner.stop();
      
      console.log(chalk.bold.cyan('\n🚀 NEXUS-402 Protocol Overview'));
      console.log(chalk.gray('═'.repeat(50)));
      console.log(`${chalk.bold('Network:')}        ${result.protocol.network}`);
      console.log(`${chalk.bold('Chain ID:')}       ${result.protocol.chainId}`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Total Agents:')}   ${result.stats.totalAgents} (${result.stats.activeAgents} active)`);
      console.log(`${chalk.bold('Total Workflows:')} ${result.stats.totalWorkflows} (${result.stats.activeWorkflows} active)`);
      console.log(`${chalk.bold('Total Payments:')}  ${result.stats.totalPayments.toLocaleString()}`);
      console.log(`${chalk.bold('Total Volume:')}    $${result.stats.totalVolume}`);
      console.log(`${chalk.bold('Success Rate:')}    ${result.stats.successRate}%`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.bold('24h Growth:'));
      console.log(`  Agents: ${chalk.green(result.growth.agents24h)}`);
      console.log(`  Workflows: ${chalk.green(result.growth.workflows24h)}`);
      console.log(`  Payments: ${chalk.green(result.growth.payments24h)}`);
      console.log(`  Volume: ${chalk.green(result.growth.volume24h)}`);
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

analytics
  .command('leaderboard')
  .description('Agent leaderboard')
  .option('-m, --metric <metric>', 'Sort by: calls, revenue, rating', 'calls')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching leaderboard...').start();
    
    try {
      const result = await api(`/api/analytics/leaderboard?metric=${options.metric}&limit=${options.limit}`);
      spinner.stop();
      
      console.log(chalk.bold.cyan('\n🏆 Agent Leaderboard'));
      console.log(chalk.gray('═'.repeat(60)));
      
      result.entries.forEach((entry: any) => {
        const badge = entry.badge || '  ';
        console.log(`${badge} #${entry.rank} ${chalk.bold(entry.name)}`);
        console.log(`    Calls: ${entry.calls.toLocaleString()} | Revenue: $${entry.revenue} | Rating: ${(entry.rating).toFixed(2)}`);
      });
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ========== Config Commands ==========

program
  .command('config')
  .description('Show configuration')
  .action(() => {
    console.log(chalk.bold.cyan('\nNEXUS-402 CLI Configuration'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('API URL:')}     ${config.apiUrl}`);
    console.log(`${chalk.bold('RPC URL:')}     ${config.rpcUrl}`);
    console.log(`${chalk.bold('Chain ID:')}    ${config.chainId}`);
    console.log(`${chalk.bold('Wallet:')}      ${config.privateKey ? chalk.green('Configured') : chalk.yellow('Not configured')}`);
    console.log(chalk.gray('\nSet environment variables in .env file:'));
    console.log(chalk.gray('  NEXUS_API_URL=http://localhost:3001'));
    console.log(chalk.gray('  CRONOS_RPC_URL=https://evm-t3.cronos.org'));
    console.log(chalk.gray('  PRIVATE_KEY=0x...'));
    console.log();
  });

program
  .command('health')
  .description('Check API health')
  .action(async () => {
    const spinner = ora('Checking API health...').start();
    
    try {
      const result = await api('/health');
      spinner.succeed(chalk.green(`API is ${result.status}!`));
      console.log(chalk.gray(`Version: ${result.version}`));
      console.log(chalk.gray(`Timestamp: ${result.timestamp}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`API is unreachable: ${error.message}`));
    }
  });

// Parse and execute
program.parse();
