'use client';

import { Header } from '@/components/Header';
import { WorkflowCard, StatCard } from '@/components/Cards';
import { Workflow, Search, Plus, Play, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  steps: any[];
  totalExecutions: number;
  successfulExecutions: number;
  isActive: boolean;
  createdAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflows?limit=20');
        const data = await res.json();
        setWorkflows(data.workflows || []);
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter(workflow => 
    search === '' || 
    workflow.name.toLowerCase().includes(search.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalExecutions = workflows.reduce((sum, w) => sum + w.totalExecutions, 0);
  const totalSuccess = workflows.reduce((sum, w) => sum + w.successfulExecutions, 0);
  const avgSuccessRate = totalExecutions > 0 ? (totalSuccess / totalExecutions * 100) : 0;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Workflows</h1>
            <p className="text-white/60">Automate multi-step AI agent processes</p>
          </div>
          <Link href="/workflows/create" className="btn-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> Create Workflow
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Workflows"
            value={workflows.length}
            change={`${workflows.filter(w => w.isActive).length} active`}
            changeType="positive"
            icon={<Workflow className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Total Executions"
            value={totalExecutions.toLocaleString()}
            description="All-time runs"
            icon={<Play className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="Success Rate"
            value={`${avgSuccessRate.toFixed(1)}%`}
            change={`${totalSuccess.toLocaleString()} successful`}
            changeType="positive"
            icon={<Zap className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Search */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light"
            />
          </div>
        </div>

        {/* Workflow Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Workflow Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-6 card-hover cursor-pointer border border-dashed border-white/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">DeFi Analytics</h3>
              <p className="text-sm text-white/60 mb-4">
                Fetch market data → Analyze trends → Generate report
              </p>
              <button className="text-sm text-cronos-light hover:underline">
                Use Template →
              </button>
            </div>
            <div className="glass rounded-xl p-6 card-hover cursor-pointer border border-dashed border-white/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="font-semibold mb-2">Payment Automation</h3>
              <p className="text-sm text-white/60 mb-4">
                Verify conditions → Process payment → Send notification
              </p>
              <button className="text-sm text-cronos-light hover:underline">
                Use Template →
              </button>
            </div>
            <div className="glass rounded-xl p-6 card-hover cursor-pointer border border-dashed border-white/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold mb-2">Multi-Agent Task</h3>
              <p className="text-sm text-white/60 mb-4">
                Research agent → Analysis agent → Action agent
              </p>
              <button className="text-sm text-cronos-light hover:underline">
                Use Template →
              </button>
            </div>
          </div>
        </div>

        {/* Workflows Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-white/10 mb-4" />
                  <div className="h-6 bg-white/10 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-full mb-4" />
                  <div className="h-8 bg-white/10 rounded" />
                </div>
              ))
            ) : filteredWorkflows.length > 0 ? (
              filteredWorkflows.map((workflow) => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow}
                  onClick={() => window.location.href = `/workflows/${workflow.id}`}
                />
              ))
            ) : (
              <div className="col-span-3 glass rounded-xl p-12 text-center">
                <Workflow className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-xl font-semibold mb-2">No Workflows Yet</h3>
                <p className="text-white/60 mb-6">
                  Create your first workflow to automate AI agent tasks
                </p>
                <Link href="/workflows/create" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Workflow
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
