'use client';

import { Header } from '@/components/Header';
import { PaymentCard, StatCard } from '@/components/Cards';
import { CreditCard, DollarSign, TrendingUp, Clock, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Payment {
  id: string;
  type: string;
  totalAmount: string;
  releasedAmount: string;
  status: string;
  createdAt: string;
}

interface PaymentStats {
  total: number;
  totalVolume: string;
  totalReleased: string;
  byType: Record<string, number>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentsRes, statsRes] = await Promise.all([
          fetch('/api/payments?limit=20'),
          fetch('/api/payments/meta/stats')
        ]);

        const paymentsData = await paymentsRes.json();
        const statsData = await statsRes.json();

        setPayments(paymentsData.payments || []);
        setStats(statsData.stats);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPayments = payments.filter(p => 
    filter === '' || p.type === filter || p.status === filter
  );

  const formatUSDC = (amount: string) => `$${(parseFloat(amount) / 1e6).toFixed(2)}`;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-white/60">x402 payment management and history</p>
          </div>
          <Link href="/payments/create" className="btn-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> New Payment
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Payments"
            value={stats?.total || 0}
            icon={<CreditCard className="w-6 h-6 text-cronos-light" />}
          />
          <StatCard
            title="Total Volume"
            value={stats ? formatUSDC(stats.totalVolume) : '$0'}
            icon={<DollarSign className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="Released"
            value={stats ? formatUSDC(stats.totalReleased) : '$0'}
            icon={<ArrowUpRight className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Pending"
            value={stats ? formatUSDC((parseFloat(stats.totalVolume) - parseFloat(stats.totalReleased)).toString()) : '$0'}
            icon={<Clock className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Payment Types */}
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Payment Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setFilter('')}
              className={`p-4 rounded-lg border transition-colors ${
                filter === '' 
                  ? 'bg-cronos-light/20 border-cronos-light' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="font-semibold">All</p>
              <p className="text-sm text-white/60">{stats?.total || 0} payments</p>
            </button>
            <button
              onClick={() => setFilter('SIMPLE')}
              className={`p-4 rounded-lg border transition-colors ${
                filter === 'SIMPLE' 
                  ? 'bg-cronos-light/20 border-cronos-light' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="font-semibold">Simple</p>
              <p className="text-sm text-white/60">{stats?.byType?.SIMPLE || 0}</p>
            </button>
            <button
              onClick={() => setFilter('STREAMING')}
              className={`p-4 rounded-lg border transition-colors ${
                filter === 'STREAMING' 
                  ? 'bg-cronos-light/20 border-cronos-light' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="font-semibold">Streaming</p>
              <p className="text-sm text-white/60">{stats?.byType?.STREAMING || 0}</p>
            </button>
            <button
              onClick={() => setFilter('RECURRING')}
              className={`p-4 rounded-lg border transition-colors ${
                filter === 'RECURRING' 
                  ? 'bg-cronos-light/20 border-cronos-light' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="font-semibold">Recurring</p>
              <p className="text-sm text-white/60">{stats?.byType?.RECURRING || 0}</p>
            </button>
          </div>
        </div>

        {/* x402 Quick Actions */}
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/payments/x402"
              className="p-4 rounded-lg bg-gradient-to-r from-cronos-light/20 to-primary-600/20 border border-cronos-light/30 hover:border-cronos-light transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-cronos-light/20 flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <p className="font-semibold">x402 Payment</p>
                  <p className="text-sm text-white/60">Gasless USDC transfer</p>
                </div>
              </div>
            </Link>
            <Link 
              href="/payments/stream"
              className="p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xl">🌊</span>
                </div>
                <div>
                  <p className="font-semibold">Stream Payment</p>
                  <p className="text-sm text-white/60">Pay over time</p>
                </div>
              </div>
            </Link>
            <Link 
              href="/payments/split"
              className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-xl">🔀</span>
                </div>
                <div>
                  <p className="font-semibold">Split Payment</p>
                  <p className="text-sm text-white/60">Multi-recipient</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Payments List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
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
            ) : filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <div className="col-span-3 glass rounded-xl p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-xl font-semibold mb-2">No Payments Yet</h3>
                <p className="text-white/60 mb-6">
                  Create your first x402 payment
                </p>
                <Link href="/payments/create" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Payment
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
