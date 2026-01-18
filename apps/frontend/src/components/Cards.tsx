'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  description?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  description 
}: StatCardProps) {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-white/60'
  };

  return (
    <div className="glass rounded-xl p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${changeColors[changeType]}`}>
              {changeType === 'positive' && '↑ '}
              {changeType === 'negative' && '↓ '}
              {change}
            </p>
          )}
          {description && (
            <p className="text-sm text-white/40 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-white/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    capabilities: string[];
    pricePerCall: string;
    rating: number;
    totalCalls: number;
    isActive: boolean;
  };
  onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const formatUSDC = (amount: string) => `$${(parseFloat(amount) / 1e6).toFixed(2)}`;
  const formatRating = (rating: number) => (rating / 100).toFixed(1);

  return (
    <div 
      className="glass rounded-xl p-6 card-hover cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cronos-light to-primary-600 flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${
          agent.isActive 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {agent.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
      <p className="text-sm text-white/60 mb-4 line-clamp-2">
        {agent.description || 'No description provided'}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.slice(0, 3).map((cap) => (
          <span 
            key={cap}
            className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80"
          >
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/60">
            +{agent.capabilities.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-sm">
          <span className="text-white/60">Price: </span>
          <span className="font-semibold">{formatUSDC(agent.pricePerCall)}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/60">
            ⭐ {formatRating(agent.rating)}
          </span>
          <span className="text-white/60">
            {agent.totalCalls.toLocaleString()} calls
          </span>
        </div>
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description?: string;
    steps: any[];
    totalExecutions: number;
    successfulExecutions: number;
    isActive: boolean;
  };
  onClick?: () => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const successRate = workflow.totalExecutions > 0
    ? ((workflow.successfulExecutions / workflow.totalExecutions) * 100).toFixed(1)
    : 'N/A';

  return (
    <div 
      className="glass rounded-xl p-6 card-hover cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-2xl">⚡</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${
          workflow.isActive 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {workflow.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">{workflow.name}</h3>
      <p className="text-sm text-white/60 mb-4 line-clamp-2">
        {workflow.description || 'No description provided'}
      </p>

      <div className="flex items-center gap-2 mb-4">
        {workflow.steps.slice(0, 4).map((_, i) => (
          <div 
            key={i}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs"
          >
            {i + 1}
          </div>
        ))}
        {workflow.steps.length > 4 && (
          <div className="text-xs text-white/60">
            +{workflow.steps.length - 4} more
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-sm">
          <span className="text-white/60">Steps: </span>
          <span className="font-semibold">{workflow.steps.length}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/60">
            {workflow.totalExecutions.toLocaleString()} runs
          </span>
          <span className={successRate !== 'N/A' && parseFloat(successRate) >= 90 
            ? 'text-green-400' 
            : 'text-white/60'
          }>
            {successRate}% success
          </span>
        </div>
      </div>
    </div>
  );
}

interface PaymentCardProps {
  payment: {
    id: string;
    type: string;
    totalAmount: string;
    releasedAmount: string;
    status: string;
    createdAt: string;
  };
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const formatUSDC = (amount: string) => `$${(parseFloat(amount) / 1e6).toFixed(2)}`;
  
  const statusColors: Record<string, string> = {
    'COMPLETED': 'bg-green-500/20 text-green-400',
    'ACTIVE': 'bg-yellow-500/20 text-yellow-400',
    'PENDING': 'bg-blue-500/20 text-blue-400',
    'CANCELLED': 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="glass rounded-xl p-6 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <span className="text-2xl">💸</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${statusColors[payment.status] || 'bg-gray-500/20 text-gray-400'}`}>
          {payment.status}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">{payment.type} Payment</h3>
      <p className="text-sm text-white/60 mb-4">
        ID: {payment.id.slice(0, 20)}...
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Total Amount</span>
          <span className="font-semibold">{formatUSDC(payment.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Released</span>
          <span className="font-semibold text-green-400">{formatUSDC(payment.releasedAmount)}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 text-sm text-white/60">
        {new Date(payment.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
