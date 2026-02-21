'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/mock-data';
import { RoleGate } from '@/components/role-gate';

export default function DashboardPage() {
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/dashboard')
      .then((data) => setDashData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl pt-12">
        <p className="text-sm text-black/30 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl pt-12">
        <p className="text-sm text-black/60">Failed to load dashboard</p>
        <p className="mt-1 text-xs text-black/40">{error}</p>
      </div>
    );
  }

  const { stats, vaults, upcomingPayments, latestAIAnalysis } = dashData;

  return (
    <div className="mx-auto max-w-4xl space-y-16 pt-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-black">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-black/35">Portfolio overview</p>
      </div>

      {/* Stats — inline */}
      <div className="flex flex-wrap gap-x-16 gap-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Total Value</p>
          <p className="mt-1 text-2xl font-semibold text-black">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">YTD Return</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.yieldYTD ? `+${stats.yieldYTD}%` : '--'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Vaults</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.activeVaults}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Assets</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.tokenizedAssets}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Payments</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.upcomingPayments}</p>
        </div>
      </div>

      {/* Vaults */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-black">Vaults</h2>
          <Link href="/vaults" className="text-xs text-black/30 hover:text-black transition-colors">
            View all
          </Link>
        </div>
        <div className="mt-4 divide-y divide-black/[0.06]">
          {vaults.length === 0 ? (
            <p className="py-8 text-sm text-black/30">No vaults yet.</p>
          ) : vaults.map((vault: any) => (
            <Link
              key={vault.id}
              href={`/vaults/${vault.id}`}
              className="flex items-center justify-between py-4 transition-colors hover:bg-black/[0.02] -mx-3 px-3 rounded"
            >
              <div>
                <p className="font-medium text-black">{vault.name}</p>
                <p className="text-xs text-black/35">{vault.assetCount} assets</p>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="font-medium text-black">{formatCurrency(vault.totalValue)}</p>
                  <p className="text-xs text-black/35">{vault.yieldYTD != null ? `+${vault.yieldYTD}%` : '--'}</p>
                </div>
                <p className="text-xs font-medium text-black/50">
                  {vault.riskScore ?? '--'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Payments */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-black">Next Payments</h2>
          <Link href="/yield-calendar" className="text-xs text-black/30 hover:text-black transition-colors">
            Calendar
          </Link>
        </div>
        <div className="mt-4 divide-y divide-black/[0.06]">
          {upcomingPayments.length === 0 ? (
            <p className="py-8 text-sm text-black/30">No upcoming payments.</p>
          ) : upcomingPayments.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-black">{p.assetName}</p>
                <p className="text-xs text-black/35">{p.vaultName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-black">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-black/35">in {p.daysUntil}d</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Analysis */}
      <section className="pb-16">
        <h2 className="text-xl font-semibold text-black">Last AI Analysis</h2>
        {latestAIAnalysis ? (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-black">{latestAIAnalysis.vaultName}</p>
              <p className="text-sm font-semibold text-black">
                {latestAIAnalysis.score}/100
              </p>
            </div>
            <p className="mt-1 text-xs text-black/35">
              {latestAIAnalysis.recommendations} recommendation(s) pending
            </p>
            <Link href="/ai-reports" className="mt-2 inline-block text-xs text-black/40 hover:text-black transition-colors">
              View report
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-black/30">No analysis yet.</p>
        )}
      </section>
    </div>
  );
}
