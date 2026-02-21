'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/mock-data';
import { api } from '@/lib/api';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function YieldCalendarPage() {
  const [vaultFilter, setVaultFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('timeline');
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/api/v1/payments'),
      api.get<any[]>('/api/v1/vaults'),
    ])
      .then(([payData, vaultData]) => {
        setAllPayments(payData);
        setVaults(vaultData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 items-center justify-center">
        <p className="text-sm text-black/30 animate-pulse">Loading yield calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-black/45">Failed to load data</p>
        <p className="text-xs text-black/30">{error}</p>
      </div>
    );
  }

  if (allPayments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-2">Hedera Schedule Service</p>
          <h1 className="text-2xl font-semibold text-black">Yield Calendar</h1>
          <p className="mt-1 text-sm text-black/45">Automated coupon payments via Hedera Schedule Service</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 border border-black/[0.06]">
          <p className="text-sm text-black/30">No coupon payments scheduled yet.</p>
        </div>
      </div>
    );
  }

  const filteredPayments = vaultFilter === 'all'
    ? allPayments
    : allPayments.filter((p: any) => p.vaultId === vaultFilter);

  const scheduled = filteredPayments.filter((p: any) => p.status === 'scheduled');
  const completed = filteredPayments.filter((p: any) => p.status === 'completed');

  const totalDistributed = completed.reduce((s: number, p: any) => s + p.amount, 0);
  const totalUpcoming = scheduled.reduce((s: number, p: any) => s + p.amount, 0);

  const groupByMonth = (list: typeof filteredPayments) => {
    const groups: Record<string, typeof filteredPayments> = {};
    for (const p of list) {
      const key = p.date.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const scheduledByMonth = groupByMonth(scheduled);
  const completedByMonth = groupByMonth(completed);

  const tabs = [
    { label: 'Timeline', value: 'timeline' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-2">Hedera Schedule Service</p>
          <h1 className="text-2xl font-semibold text-black">Yield Calendar</h1>
          <p className="mt-1 text-sm text-black/45">Automated coupon payments via Hedera Schedule Service</p>
        </div>
        <Select value={vaultFilter} onValueChange={setVaultFilter}>
          <SelectTrigger className="w-[180px] border border-black/10 bg-transparent text-sm text-black">
            <SelectValue placeholder="Filter by vault" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vaults</SelectItem>
            {vaults.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-4">Summary</p>
        <div className="grid grid-cols-2 gap-px md:grid-cols-4 border border-black/[0.06]">
          <div className="p-4 bg-white">
            <p className="text-xs text-black/30 uppercase tracking-widest">Total Distributed</p>
            <p className="mt-1 text-xl font-medium text-black">{formatCurrency(totalDistributed)}</p>
          </div>
          <div className="p-4 bg-white border-l border-black/[0.06]">
            <p className="text-xs text-black/30 uppercase tracking-widest">Upcoming Total</p>
            <p className="mt-1 text-xl font-medium text-black">{formatCurrency(totalUpcoming)}</p>
          </div>
          <div className="p-4 bg-white border-l border-black/[0.06]">
            <p className="text-xs text-black/30 uppercase tracking-widest">Completed</p>
            <p className="mt-1 text-xl font-medium text-black">{completed.length}</p>
          </div>
          <div className="p-4 bg-white border-l border-black/[0.06]">
            <p className="text-xs text-black/30 uppercase tracking-widest">Scheduled</p>
            <p className="mt-1 text-xl font-medium text-black">{scheduled.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-6 border-b border-black/[0.06] mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`pb-3 text-sm transition-colors ${
                activeTab === tab.value
                  ? 'border-b-2 border-black text-black font-medium'
                  : 'text-black/30 hover:text-black/45'
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline View */}
        {activeTab === 'timeline' && (
          <div className="space-y-0">
            {/* Completed */}
            {completedByMonth.map(([monthKey, monthPayments]) => {
              const [year, month] = monthKey.split('-');
              return (
                <div key={monthKey} className="relative flex gap-6 pb-8">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="h-2 w-2 rounded-full bg-black/20 mt-1.5" />
                    <div className="w-px flex-1 bg-black/[0.06] mt-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30 mb-3">
                      {months[parseInt(month) - 1]} {year}
                    </p>
                    <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                      {monthPayments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-black">{p.assetName}</p>
                            <p className="text-xs text-black/30">
                              {p.vaultName} &middot; {p.recipients} recipients
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-black">{formatCurrency(p.amount)}</p>
                            <p className="text-xs text-black/30">Completed</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Now marker */}
            <div className="relative flex gap-6 pb-8">
              <div className="flex flex-col items-center pt-0.5">
                <div className="h-2 w-2 rounded-full bg-black mt-1.5" />
                <div className="w-px flex-1 bg-black/[0.06] mt-1" />
              </div>
              <div className="flex items-center pt-1">
                <span className="text-xs font-medium text-black border border-black px-2 py-0.5">Now — Feb 2026</span>
              </div>
            </div>

            {/* Upcoming */}
            {scheduledByMonth.map(([monthKey, monthPayments]) => {
              const [year, month] = monthKey.split('-');
              return (
                <div key={monthKey} className="relative flex gap-6 pb-8">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="h-2 w-2 rounded-full border border-black/20 mt-1.5" />
                    <div className="w-px flex-1 bg-black/[0.06] mt-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30 mb-3">
                      {months[parseInt(month) - 1]} {year}
                    </p>
                    <div className="divide-y divide-black/[0.06] border-y border-dashed border-black/[0.06]">
                      {monthPayments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-black">{p.assetName}</p>
                            <p className="text-xs text-black/30">
                              {p.vaultName} &middot; {p.recipients} recipients
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-black">{formatCurrency(p.amount)}</p>
                            <p className="text-xs text-black/30">in {p.daysUntil}d</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming List */}
        {activeTab === 'upcoming' && (
          <div>
            {scheduled.length === 0 ? (
              <p className="text-sm text-black/30 py-8 text-center">No upcoming payments</p>
            ) : (
              <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                {scheduled.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-black">{p.assetName}</p>
                      <p className="text-xs text-black/30">
                        {p.vaultName} &middot; {p.date} &middot; {p.recipients} recipients
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-medium text-black">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-black/30">in {p.daysUntil} days</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed List */}
        {activeTab === 'completed' && (
          <div>
            {completed.length === 0 ? (
              <p className="text-sm text-black/30 py-8 text-center">No completed payments</p>
            ) : (
              <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                {completed.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-black">{p.assetName}</p>
                      <p className="text-xs text-black/30">
                        {p.vaultName} &middot; {p.date} &middot; {p.recipients} recipients
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-medium text-black">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-black/30">Completed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
