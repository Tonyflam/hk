#!/usr/bin/env node

/**
 * NEXUS-402 MCP Server
 * 
 * Model Context Protocol server that enables AI assistants like Claude
 * to interact with the NEXUS-402 protocol on Cronos.
 * 
 * This allows AI agents to:
 * - Discover and call other AI agents
 * - Create and execute multi-step workflows
 * - Process x402 payments
 * - Browse the marketplace
 * - Get protocol analytics
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Configuration
const API_URL = process.env.NEXUS_API_URL || 'http://localhost:3001';

// API helper
async function api(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }
  
  return response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'nexus-402',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ========== Resources ==========

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'nexus://agents',
        name: 'Available Agents',
        description: 'List of all registered AI agents on NEXUS-402',
        mimeType: 'application/json'
      },
      {
        uri: 'nexus://workflows',
        name: 'Workflows',
        description: 'List of available workflow templates',
        mimeType: 'application/json'
      },
      {
        uri: 'nexus://marketplace',
        name: 'Marketplace',
        description: 'Available services and listings in the marketplace',
        mimeType: 'application/json'
      },
      {
        uri: 'nexus://analytics',
        name: 'Protocol Analytics',
        description: 'Current protocol statistics and metrics',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  try {
    let data: any;

    if (uri === 'nexus://agents') {
      data = await api('/api/agents');
    } else if (uri === 'nexus://workflows') {
      data = await api('/api/workflows');
    } else if (uri === 'nexus://marketplace') {
      data = await api('/api/marketplace/listings');
    } else if (uri === 'nexus://analytics') {
      data = await api('/api/analytics/overview');
    } else {
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error: any) {
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});

// ========== Tools ==========

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Agent Tools
      {
        name: 'list_agents',
        description: 'List all available AI agents on NEXUS-402. Returns agent names, capabilities, pricing, and ratings.',
        inputSchema: {
          type: 'object',
          properties: {
            capability: {
              type: 'string',
              description: 'Filter by capability (e.g., "defi", "payments", "analytics")'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return',
              default: 10
            }
          }
        }
      },
      {
        name: 'get_agent',
        description: 'Get detailed information about a specific AI agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique identifier of the agent'
            }
          },
          required: ['agentId']
        }
      },
      {
        name: 'call_agent',
        description: 'Call an AI agent to perform a task. The agent will process the input and return a result. Payment is handled automatically via x402.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The agent ID to call'
            },
            task: {
              type: 'string',
              description: 'Description of the task for the agent'
            },
            parameters: {
              type: 'object',
              description: 'Additional parameters for the agent call'
            }
          },
          required: ['agentId', 'task']
        }
      },
      
      // Workflow Tools
      {
        name: 'list_workflows',
        description: 'List available workflow templates and active workflows',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return',
              default: 10
            }
          }
        }
      },
      {
        name: 'create_workflow',
        description: 'Create a new multi-step workflow that chains multiple agent calls together',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the workflow'
            },
            description: {
              type: 'string',
              description: 'Description of what the workflow does'
            },
            steps: {
              type: 'array',
              description: 'Array of workflow steps',
              items: {
                type: 'object',
                properties: {
                  agentId: { type: 'string' },
                  action: { type: 'string' },
                  params: { type: 'object' }
                }
              }
            }
          },
          required: ['name', 'steps']
        }
      },
      {
        name: 'execute_workflow',
        description: 'Execute a workflow by ID',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              description: 'The workflow ID to execute'
            },
            input: {
              type: 'object',
              description: 'Input parameters for the workflow'
            }
          },
          required: ['workflowId']
        }
      },
      
      // Payment Tools
      {
        name: 'create_payment',
        description: 'Create a new x402 payment. Returns payment authorization for on-chain execution.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient address'
            },
            amount: {
              type: 'string',
              description: 'Amount in USDC (e.g., "10.00")'
            },
            type: {
              type: 'string',
              enum: ['simple', 'streaming', 'recurring'],
              description: 'Payment type',
              default: 'simple'
            }
          },
          required: ['to', 'amount']
        }
      },
      {
        name: 'get_payment_stats',
        description: 'Get payment statistics and volume metrics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      
      // Marketplace Tools
      {
        name: 'browse_marketplace',
        description: 'Browse the NEXUS-402 marketplace for AI agent services',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by category'
            },
            sort: {
              type: 'string',
              enum: ['rating', 'sales', 'price-low', 'price-high'],
              description: 'Sort order'
            },
            limit: {
              type: 'number',
              description: 'Maximum results',
              default: 10
            }
          }
        }
      },
      {
        name: 'get_marketplace_categories',
        description: 'Get all marketplace categories with listing counts',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      
      // Analytics Tools
      {
        name: 'get_protocol_overview',
        description: 'Get comprehensive protocol analytics including agent counts, workflow stats, and payment volume',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_leaderboard',
        description: 'Get the agent leaderboard ranked by calls, revenue, or rating',
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              enum: ['calls', 'revenue', 'rating'],
              description: 'Ranking metric',
              default: 'calls'
            },
            limit: {
              type: 'number',
              description: 'Number of entries',
              default: 10
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Agent Tools
      case 'list_agents': {
        const params = new URLSearchParams();
        if (args?.capability) params.set('capability', args.capability as string);
        if (args?.limit) params.set('limit', String(args.limit));
        
        const result = await api(`/api/agents?${params}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                agents: result.agents.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  description: a.description,
                  capabilities: a.capabilities,
                  pricePerCall: `$${(parseFloat(a.pricePerCall) / 1e6).toFixed(2)}`,
                  totalCalls: a.totalCalls,
                  rating: (a.rating / 100).toFixed(1)
                })),
                total: result.pagination.total
              }, null, 2)
            }
          ]
        };
      }

      case 'get_agent': {
        const result = await api(`/api/agents/${args?.agentId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                agent: {
                  ...result.agent,
                  pricePerCall: `$${(parseFloat(result.agent.pricePerCall) / 1e6).toFixed(2)}`,
                  totalRevenue: `$${(parseFloat(result.agent.totalRevenue) / 1e6).toFixed(2)}`,
                  rating: (result.agent.rating / 100).toFixed(1)
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'call_agent': {
        const parameters = args?.parameters && typeof args.parameters === 'object' ? args.parameters as Record<string, unknown> : {};
        const result = await api(`/api/agents/${args?.agentId}/call`, {
          method: 'POST',
          body: JSON.stringify({
            task: args?.task,
            ...parameters
          })
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                callId: result.callId,
                output: result.output,
                payment: {
                  amount: `$${(parseFloat(result.payment.amount) / 1e6).toFixed(2)}`,
                  status: result.payment.status
                }
              }, null, 2)
            }
          ]
        };
      }

      // Workflow Tools
      case 'list_workflows': {
        const result = await api(`/api/workflows?limit=${args?.limit || 10}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                workflows: result.workflows.map((w: any) => ({
                  id: w.id,
                  name: w.name,
                  description: w.description,
                  stepCount: w.steps.length,
                  totalExecutions: w.totalExecutions,
                  successRate: w.totalExecutions > 0 
                    ? `${((w.successfulExecutions / w.totalExecutions) * 100).toFixed(1)}%`
                    : 'N/A'
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'create_workflow': {
        const result = await api('/api/workflows', {
          method: 'POST',
          body: JSON.stringify({
            name: args?.name,
            description: args?.description,
            steps: args?.steps
          })
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                workflowId: result.workflow.id,
                message: `Workflow "${args?.name}" created successfully`
              }, null, 2)
            }
          ]
        };
      }

      case 'execute_workflow': {
        const result = await api(`/api/workflows/${args?.workflowId}/execute`, {
          method: 'POST',
          body: JSON.stringify(args?.input || {})
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                executionId: result.executionId,
                status: result.status,
                message: 'Workflow execution started'
              }, null, 2)
            }
          ]
        };
      }

      // Payment Tools
      case 'create_payment': {
        const amountInMicroUSDC = (parseFloat(args?.amount as string) * 1e6).toString();
        const result = await api('/api/payments/x402', {
          method: 'POST',
          body: JSON.stringify({
            to: args?.to,
            amount: amountInMicroUSDC
          })
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                paymentObject: result.paymentObject,
                instructions: 'Sign this payment object with your wallet to authorize the transfer'
              }, null, 2)
            }
          ]
        };
      }

      case 'get_payment_stats': {
        const result = await api('/api/payments/meta/stats');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                stats: {
                  total: result.stats.total,
                  totalVolume: `$${(parseFloat(result.stats.totalVolume) / 1e6).toFixed(2)}`,
                  totalReleased: `$${(parseFloat(result.stats.totalReleased) / 1e6).toFixed(2)}`,
                  byType: result.stats.byType
                }
              }, null, 2)
            }
          ]
        };
      }

      // Marketplace Tools
      case 'browse_marketplace': {
        const params = new URLSearchParams();
        if (args?.category) params.set('category', args.category as string);
        if (args?.sort) params.set('sort', args.sort as string);
        if (args?.limit) params.set('limit', String(args.limit));
        
        const result = await api(`/api/marketplace/listings?${params}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                listings: result.listings.map((l: any) => ({
                  id: l.id,
                  name: l.name,
                  description: l.description,
                  category: l.category,
                  price: `$${(parseFloat(l.pricePerUnit) / 1e6).toFixed(2)}`,
                  sales: l.totalSales,
                  rating: (l.rating / 100).toFixed(1)
                })),
                total: result.pagination.total
              }, null, 2)
            }
          ]
        };
      }

      case 'get_marketplace_categories': {
        const result = await api('/api/marketplace/categories');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                categories: result.categories
              }, null, 2)
            }
          ]
        };
      }

      // Analytics Tools
      case 'get_protocol_overview': {
        const result = await api('/api/analytics/overview');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                protocol: result.protocol,
                stats: {
                  ...result.stats,
                  totalVolume: `$${result.stats.totalVolume}`
                },
                growth: result.growth
              }, null, 2)
            }
          ]
        };
      }

      case 'get_leaderboard': {
        const result = await api(`/api/analytics/leaderboard?metric=${args?.metric || 'calls'}&limit=${args?.limit || 10}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                metric: args?.metric || 'calls',
                leaderboard: result.entries.map((e: any) => ({
                  rank: e.rank,
                  badge: e.badge,
                  name: e.name,
                  agentId: e.agentId,
                  calls: e.calls,
                  revenue: `$${e.revenue}`,
                  rating: e.rating.toFixed(2)
                }))
              }, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NEXUS-402 MCP Server running on stdio');
}

main().catch(console.error);
