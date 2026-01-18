'use client';

import { Header } from '@/components/Header';
import { AgentCard, StatCard } from '@/components/Cards';
import { Bot, Search, Filter, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  pricePerCall: string;
  rating: number;
  totalCalls: number;
  isActive: boolean;
  owner: string;
}

const CAPABILITIES = [
  'defi', 'payments', 'analytics', 'trading', 
  'data-oracle', 'automation', 'security', 'rwa'
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [capability, setCapability] = useState('');
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const params = new URLSearchParams();
        if (capability) params.set('capability', capability);
        if (sort) params.set('sort', sort);
        params.set('limit', '20');

        const res = await fetch(`/api/agents?${params}`);
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [capability, sort]);

  const filteredAgents = agents.filter(agent => 
    search === '' || 
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCalls = agents.reduce((sum, a) => sum + a.totalCalls, 0);
  const avgRating = agents.length > 0 
    ? agents.reduce((sum, a) => sum + a.rating, 0) / agents.length 
    : 0;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Agents</h1>
            <p className="text-white/60">Discover and connect with specialized AI agents</p>
          </div>
          <Link href="/agents/register" className="btn-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> Register Agent
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Agents"
            value={agents.length}
            change={`${agents.filter(a => a.isActive).length} active`}
            changeType="positive"
            icon={<Bot className="w-6 h-6 text-cronos-light" />}
          />
          <StatCard
            title="Total Calls"
            value={totalCalls.toLocaleString()}
            description="Across all agents"
            icon={<ArrowRight className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Avg Rating"
            value={`${(avgRating / 100).toFixed(1)} ⭐`}
            description="Out of 5.0"
            icon={<Bot className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light"
              />
            </div>

            {/* Capability Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <select
                value={capability}
                onChange={(e) => setCapability(e.target.value)}
                className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light appearance-none cursor-pointer"
              >
                <option value="">All Capabilities</option>
                {CAPABILITIES.map(cap => (
                  <option key={cap} value={cap}>{cap}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light appearance-none cursor-pointer"
            >
              <option value="rating">Top Rated</option>
              <option value="calls">Most Calls</option>
              <option value="revenue">Top Revenue</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Agents Grid */}
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
          ) : filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onClick={() => window.location.href = `/agents/${agent.id}`}
              />
            ))
          ) : (
            <div className="col-span-3 glass rounded-xl p-12 text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-xl font-semibold mb-2">No Agents Found</h3>
              <p className="text-white/60 mb-6">
                {search || capability 
                  ? 'Try adjusting your filters'
                  : 'Be the first to register an agent!'
                }
              </p>
              <Link href="/agents/register" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Register Agent
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
