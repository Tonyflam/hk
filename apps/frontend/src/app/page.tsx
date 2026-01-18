'use client';

import { Header } from '@/components/Header';
import { StatCard, AgentCard, WorkflowCard } from '@/components/Cards';
import { Bot, Workflow, CreditCard, TrendingUp, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface OverviewStats {
  totalAgents: number;
  activeAgents: number;
  totalWorkflows: number;
  activeWorkflows: number;
  totalPayments: number;
  totalVolume: string;
  successRate: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  pricePerCall: string;
  rating: number;
  totalCalls: number;
  isActive: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: any[];
  totalExecutions: number;
  successfulExecutions: number;
  isActive: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, agentsRes, workflowsRes] = await Promise.all([
          fetch('/api/analytics/overview'),
          fetch('/api/agents?limit=4'),
          fetch('/api/workflows?limit=4')
        ]);

        const overview = await overviewRes.json();
        const agentsData = await agentsRes.json();
        const workflowsData = await workflowsRes.json();

        setStats(overview.stats);
        setAgents(agentsData.agents || []);
        setWorkflows(workflowsData.workflows || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="glass rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cronos-light/20 to-primary-600/20" />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to <span className="gradient-text">NEXUS-402</span>
            </h1>
            <p className="text-lg text-white/80 mb-6 max-w-2xl">
              The Universal x402 Orchestration Protocol & Agent Marketplace for Cronos. 
              Connect AI agents, automate workflows, and process crypto payments seamlessly.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/agents" className="btn-primary flex items-center gap-2">
                Explore Agents <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/workflows" className="btn-secondary flex items-center gap-2">
                Create Workflow <Zap className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6 card-hover">
            <div className="w-12 h-12 rounded-lg bg-cronos-light/20 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-cronos-light" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Agent Registry</h3>
            <p className="text-sm text-white/60">
              Discover and connect with specialized AI agents for DeFi, payments, analytics, and more.
            </p>
          </div>
          <div className="glass rounded-xl p-6 card-hover">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <Workflow className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Workflow Automation</h3>
            <p className="text-sm text-white/60">
              Create multi-step workflows that chain agent calls with conditional logic.
            </p>
          </div>
          <div className="glass rounded-xl p-6 card-hover">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">x402 Payments</h3>
            <p className="text-sm text-white/60">
              Gasless USDC payments with streaming, splits, and recurring options.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Agents"
            value={loading ? '...' : stats?.totalAgents || 0}
            change={`${stats?.activeAgents || 0} active`}
            changeType="positive"
            icon={<Bot className="w-6 h-6 text-cronos-light" />}
          />
          <StatCard
            title="Workflows"
            value={loading ? '...' : stats?.totalWorkflows || 0}
            change={`${stats?.activeWorkflows || 0} active`}
            changeType="positive"
            icon={<Workflow className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Total Payments"
            value={loading ? '...' : stats?.totalPayments?.toLocaleString() || 0}
            change={`${stats?.successRate || 0}% success rate`}
            changeType="positive"
            icon={<CreditCard className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="Total Volume"
            value={loading ? '...' : `$${stats?.totalVolume || '0'}`}
            change="USDC on Cronos"
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Agents Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Top Agents</h2>
              <p className="text-white/60">Discover high-performing AI agents</p>
            </div>
            <Link href="/agents" className="text-cronos-light hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-white/10 mb-4" />
                  <div className="h-6 bg-white/10 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-full mb-4" />
                  <div className="h-8 bg-white/10 rounded" />
                </div>
              ))
            ) : agents.length > 0 ? (
              agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            ) : (
              <div className="col-span-4 glass rounded-xl p-12 text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/60">No agents registered yet</p>
                <Link href="/agents/register" className="btn-primary mt-4 inline-block">
                  Register First Agent
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Workflows Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Recent Workflows</h2>
              <p className="text-white/60">Automated multi-step processes</p>
            </div>
            <Link href="/workflows" className="text-cronos-light hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-white/10 mb-4" />
                  <div className="h-6 bg-white/10 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-full mb-4" />
                  <div className="h-8 bg-white/10 rounded" />
                </div>
              ))
            ) : workflows.length > 0 ? (
              workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))
            ) : (
              <div className="col-span-4 glass rounded-xl p-12 text-center">
                <Workflow className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/60">No workflows created yet</p>
                <Link href="/workflows/create" className="btn-primary mt-4 inline-block">
                  Create First Workflow
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Protocol Features */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Why NEXUS-402?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-cronos-light/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-cronos-light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Gasless Payments</h3>
              <p className="text-sm text-white/60">
                Pay for AI services with USDC using x402 protocol. No CRO needed for gas.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure & Trustless</h3>
              <p className="text-sm text-white/60">
                On-chain verification ensures payments only execute when services are delivered.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Open Ecosystem</h3>
              <p className="text-sm text-white/60">
                Anyone can register agents, create workflows, and participate in the marketplace.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cronos-light to-primary-600 flex items-center justify-center">
                <span className="text-sm font-bold">N</span>
              </div>
              <span className="font-semibold">NEXUS-402</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <a href="https://cronos.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Cronos
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                GitHub
              </a>
              <a href="#" className="hover:text-white">Docs</a>
              <a href="#" className="hover:text-white">Discord</a>
            </div>
            <p className="text-sm text-white/40">
              Built for Cronos x402 Paytech Hackathon
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
