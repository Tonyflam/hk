'use client';

import { Header } from '@/components/Header';
import { StatCard } from '@/components/Cards';
import { BarChart3, TrendingUp, Users, DollarSign, Activity, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface OverviewData {
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalWorkflows: number;
    activeWorkflows: number;
    totalPayments: number;
    totalVolume: string;
    successRate: string;
  };
  growth: {
    agents24h: string;
    workflows24h: string;
    payments24h: string;
    volume24h: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  badge?: string;
  agentId: string;
  name: string;
  calls: number;
  revenue: string;
  rating: number;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, leaderboardRes] = await Promise.all([
          fetch('/api/analytics/overview'),
          fetch('/api/analytics/leaderboard?metric=calls&limit=10')
        ]);

        const overviewData = await overviewRes.json();
        const leaderboardData = await leaderboardRes.json();

        setOverview(overviewData);
        setLeaderboard(leaderboardData.entries || []);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sample data for charts
  const volumeData = [
    { name: 'Mon', volume: 12400, payments: 45 },
    { name: 'Tue', volume: 18200, payments: 62 },
    { name: 'Wed', volume: 15800, payments: 58 },
    { name: 'Thu', volume: 22100, payments: 78 },
    { name: 'Fri', volume: 28500, payments: 95 },
    { name: 'Sat', volume: 19200, payments: 68 },
    { name: 'Sun', volume: 16800, payments: 52 },
  ];

  const agentDistribution = [
    { name: 'DeFi', value: 35, color: '#00A3FF' },
    { name: 'Payments', value: 25, color: '#8B5CF6' },
    { name: 'Analytics', value: 20, color: '#10B981' },
    { name: 'Trading', value: 12, color: '#F59E0B' },
    { name: 'Other', value: 8, color: '#6B7280' },
  ];

  const callsData = [
    { hour: '00:00', calls: 120 },
    { hour: '04:00', calls: 85 },
    { hour: '08:00', calls: 210 },
    { hour: '12:00', calls: 380 },
    { hour: '16:00', calls: 420 },
    { hour: '20:00', calls: 290 },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-white/60">Protocol metrics and performance insights</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Volume"
            value={`$${overview?.stats?.totalVolume || '0'}`}
            change={overview?.growth?.volume24h || '+0%'}
            changeType="positive"
            icon={<DollarSign className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="Active Agents"
            value={overview?.stats?.activeAgents || 0}
            change={overview?.growth?.agents24h || '+0'}
            changeType="positive"
            icon={<Users className="w-6 h-6 text-cronos-light" />}
          />
          <StatCard
            title="Total Payments"
            value={overview?.stats?.totalPayments?.toLocaleString() || '0'}
            change={overview?.growth?.payments24h || '+0'}
            changeType="positive"
            icon={<Activity className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Success Rate"
            value={`${overview?.stats?.successRate || 0}%`}
            change="All time"
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Volume Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Volume (7 days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00A3FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#00A3FF" 
                    fill="url(#volumeGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Distribution */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Agent Distribution by Category</h3>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {agentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {agentDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-white/80">{item.name}</span>
                    <span className="text-sm text-white/60">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calls Activity */}
        <div className="glass rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Agent Calls (24h)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="calls" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Agent Leaderboard</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-cronos-light/20 text-cronos-light rounded-lg text-sm">
                Calls
              </button>
              <button className="px-3 py-1 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10">
                Revenue
              </button>
              <button className="px-3 py-1 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10">
                Rating
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-white/60 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">Rank</th>
                  <th className="pb-4 font-medium">Agent</th>
                  <th className="pb-4 font-medium text-right">Calls</th>
                  <th className="pb-4 font-medium text-right">Revenue</th>
                  <th className="pb-4 font-medium text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-4"><div className="h-6 w-8 bg-white/10 rounded animate-pulse" /></td>
                      <td className="py-4"><div className="h-6 w-32 bg-white/10 rounded animate-pulse" /></td>
                      <td className="py-4 text-right"><div className="h-6 w-16 bg-white/10 rounded animate-pulse ml-auto" /></td>
                      <td className="py-4 text-right"><div className="h-6 w-20 bg-white/10 rounded animate-pulse ml-auto" /></td>
                      <td className="py-4 text-right"><div className="h-6 w-12 bg-white/10 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <tr key={entry.agentId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {entry.rank <= 3 ? (
                            <span className="text-lg">{entry.badge}</span>
                          ) : (
                            <span className="text-white/60">#{entry.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cronos-light to-primary-600 flex items-center justify-center">
                            <span className="text-sm">🤖</span>
                          </div>
                          <span className="font-medium">{entry.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right font-mono">
                        {entry.calls.toLocaleString()}
                      </td>
                      <td className="py-4 text-right font-mono text-green-400">
                        ${entry.revenue}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-yellow-400">⭐</span> {entry.rating.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/60">
                      No leaderboard data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
