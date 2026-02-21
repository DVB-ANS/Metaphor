'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  formatCurrency,
  getAssetTypeLabel,
  type AIReport,
  type Vault,
  type Payment,
  type ScoreHistory,
} from '@/lib/mock-data';
import { api } from '@/lib/api';

const COLORS = ['#000', '#555', '#888', '#aaa', '#ccc'];

/** Map a backend AIReport (reportId, riskScore, description) to frontend AIReport (id, score, detail) */
function mapBackendReport(raw: any): AIReport {
  return {
    id: raw.reportId ?? raw.id,
    vaultId: raw.vaultId,
    vaultName: raw.vaultName ?? '',
    date: raw.createdAt ?? raw.date ?? new Date().toISOString().slice(0, 10),
    score: raw.riskScore ?? raw.score,
    riskLevel: raw.riskLevel,
    summary: raw.summary,
    recommendations: (raw.recommendations ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      detail: r.description ?? r.detail,
      impact: r.impact,
      status: r.status === 'pending_approval' ? 'pending' : r.status,
    })),
    stressTests: raw.stressTests ?? [],
    positionAnalysis: (raw.positionAnalysis ?? []).map((p: any) => ({
      name: p.name ?? p.assetId,
      score: p.score,
      riskLevel: p.riskLevel,
      comment: p.comment,
    })),
  };
}

export default function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [vault, setVault] = useState<Vault | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [existingReport, setExistingReport] = useState<AIReport | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIReport | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    Promise.all([
      api.get<Vault>(`/api/v1/vaults/${id}`),
      api.get<Payment[]>(`/api/v1/payments?vaultId=${id}`),
      api.get<any[]>(`/api/v1/ai/reports?vaultId=${id}`),
      api.get<ScoreHistory[]>(`/api/v1/ai/score-history?vaultId=${id}`),
    ])
      .then(([vaultData, paymentsData, reportsData, historyData]) => {
        setVault(vaultData);
        setPayments(paymentsData);
        if (reportsData.length > 0) {
          setExistingReport(reportsData[0]);
        }
        setScoreHistory(historyData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl pt-12">
        <p className="text-sm text-black/30 animate-pulse">Loading vault...</p>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="mx-auto max-w-4xl pt-12">
        <p className="text-sm text-black/40">{error || 'Vault not found'}</p>
        <button
          onClick={() => router.push('/vaults')}
          className="mt-3 text-xs text-black/30 hover:text-black transition-colors"
        >
          Back to vaults
        </button>
      </div>
    );
  }

  const vaultPayments = payments;
  const upcomingPayments = vaultPayments.filter((p) => p.status === 'scheduled');
  const pastPayments = vaultPayments.filter((p) => p.status === 'completed');

  const allocationData = vault.assets.map((a) => ({
    name: a.name.length > 20 ? a.name.slice(0, 20) + '...' : a.name,
    value: a.allocation,
  }));

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const raw = await api.post('/api/ai/analyze', {
        vaultId: vault.id,
        assets: vault.assets.map((a) => ({
          assetId: a.id,
          nominalValue: a.value,
          couponRate: a.couponRate,
          maturityDate: a.maturityDate,
          rating: a.rating,
          jurisdiction: a.jurisdiction,
        })),
      });
      setAnalysisResult(mapBackendReport(raw));
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const currentReport = analysisResult || existingReport;

  const handleApprove = (recId: string) => {
    setSelectedRecId(recId);
    setApproveDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!currentReport || !selectedRecId) return;
    setActionLoading(selectedRecId);
    try {
      const reportId = currentReport.id;
      const raw = await api.post(`/api/ai/reports/${reportId}/approve`, {
        recommendationId: selectedRecId,
      });
      const updated = mapBackendReport(raw);
      if (analysisResult) setAnalysisResult(updated);
      else setExistingReport(updated);
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    } finally {
      setActionLoading(null);
      setApproveDialogOpen(false);
      setSelectedRecId(null);
    }
  };

  const handleReject = async (recId: string) => {
    if (!currentReport) return;
    setActionLoading(recId);
    try {
      const reportId = currentReport.id;
      const raw = await api.post(`/api/ai/reports/${reportId}/reject`, {
        recommendationId: recId,
      });
      const updated = mapBackendReport(raw);
      if (analysisResult) setAnalysisResult(updated);
      else setExistingReport(updated);
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const statusLabel =
    vault.status === 'active' ? 'Active' : vault.status === 'attention' ? 'Attention' : 'Matured';

  const displayedPayments = activeTab === 'upcoming' ? upcomingPayments : pastPayments;

  return (
    <div className="mx-auto max-w-4xl space-y-16 pt-4">
      {/* Header */}
      <div>
        <Link
          href="/vaults"
          className="text-xs text-black/30 hover:text-black transition-colors"
        >
          Vaults
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-black">
              {vault.name}
            </h1>
            <p className="mt-1 text-sm text-black/35">
              Created {vault.createdAt} &middot; {vault.assetCount} assets &middot; {statusLabel}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="text-xs font-medium text-black/40 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-black/10 px-3 py-1.5 rounded"
          >
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="flex flex-wrap gap-x-16 gap-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Total Value</p>
          <p className="mt-1 text-2xl font-semibold text-black">{formatCurrency(vault.totalValue)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">YTD Return</p>
          <p className="mt-1 text-2xl font-semibold text-black">
            {vault.yieldYTD != null ? `+${vault.yieldYTD}%` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Risk Score</p>
          <p className="mt-1 text-2xl font-semibold text-black">
            {vault.riskScore != null ? `${vault.riskScore}/100` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/30">Upcoming Payments</p>
          <p className="mt-1 text-2xl font-semibold text-black">{upcomingPayments.length}</p>
        </div>
      </div>

      {/* Asset Composition */}
      <section>
        <h2 className="text-xl font-semibold text-black">Asset Composition</h2>
        <div className="mt-6 divide-y divide-black/[0.06]">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-4 pb-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <span className="col-span-2">Asset</span>
            <span>Type</span>
            <span className="text-right">Alloc.</span>
            <span className="text-right">Value</span>
            <span>Rating</span>
            <span className="text-right">Coupon</span>
          </div>
          {vault.assets.map((asset) => (
            <div key={asset.id} className="grid grid-cols-7 gap-4 py-3 text-sm">
              <div className="col-span-2">
                <p className="font-medium text-black">{asset.name}</p>
                <p className="text-xs text-black/35">{asset.maturityDate}</p>
              </div>
              <span className="self-center text-xs text-black/45">{getAssetTypeLabel(asset.type)}</span>
              <span className="self-center text-right text-black/45">{asset.allocation}%</span>
              <span className="self-center text-right font-medium text-black">{formatCurrency(asset.value)}</span>
              <span className="self-center text-xs font-medium text-black/45">{asset.rating}</span>
              <span className="self-center text-right text-black/45">{asset.couponRate}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Allocation Chart */}
      <section>
        <h2 className="text-xl font-semibold text-black">Allocation</h2>
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#000',
                  }}
                  formatter={(value) => [`${value}%`, 'Allocation']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 divide-y divide-black/[0.06]">
            {vault.assets.map((asset, i) => (
              <div key={asset.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm text-black/45">
                    {asset.name.length > 30 ? asset.name.slice(0, 30) + '...' : asset.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-black">{asset.allocation}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk Score History */}
      {scoreHistory.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-black">Risk Score History</h2>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreHistory} barSize={20}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#000',
                  }}
                  formatter={(value) => [`${value}/100`, 'Risk Score']}
                />
                <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                  {scoreHistory.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.score < 30
                          ? '#000'
                          : entry.score < 60
                            ? 'rgba(0,0,0,0.45)'
                            : 'rgba(0,0,0,0.2)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Payments */}
      <section>
        <h2 className="text-xl font-semibold text-black">Payments</h2>

        {/* Tabs */}
        <div className="mt-4 flex gap-6 border-b border-black/[0.06]">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2 text-sm transition-colors ${
              activeTab === 'upcoming'
                ? 'font-medium text-black border-b border-black -mb-px'
                : 'text-black/35 hover:text-black/60'
            }`}
          >
            Upcoming
            {upcomingPayments.length > 0 && (
              <span className="ml-2 text-xs text-black/30">({upcomingPayments.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2 text-sm transition-colors ${
              activeTab === 'completed'
                ? 'font-medium text-black border-b border-black -mb-px'
                : 'text-black/35 hover:text-black/60'
            }`}
          >
            Completed
            {pastPayments.length > 0 && (
              <span className="ml-2 text-xs text-black/30">({pastPayments.length})</span>
            )}
          </button>
        </div>

        <div className="mt-2 divide-y divide-black/[0.06]">
          {displayedPayments.length === 0 ? (
            <p className="py-8 text-sm text-black/30">
              {activeTab === 'upcoming' ? 'No upcoming payments.' : 'No completed payments.'}
            </p>
          ) : (
            displayedPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-black">{p.assetName}</p>
                  <p className="text-xs text-black/35">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-black">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-black/35">
                    {activeTab === 'upcoming' ? `in ${p.daysUntil}d` : 'Completed'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AI Analysis */}
      {currentReport && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-black">AI Risk Analysis</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-black/30">0G Compute</span>
              <span className="text-sm font-semibold text-black">
                {currentReport.score}/100
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm text-black/45">{currentReport.summary}</p>

          {/* Position Analysis */}
          {currentReport.positionAnalysis.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-widest text-black/30">Position Analysis</p>
              <div className="mt-3 divide-y divide-black/[0.06]">
                {currentReport.positionAnalysis.map((pos) => (
                  <div key={pos.name} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black">{pos.name}</span>
                      <span className="text-sm font-medium text-black">
                        {pos.score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-black/35">{pos.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stress Tests */}
          {currentReport.stressTests.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-widest text-black/30">Stress Tests</p>
              <div className="mt-3 divide-y divide-black/[0.06]">
                {currentReport.stressTests.map((test, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <span className="text-sm text-black/45">{test.scenario}</span>
                    <span className="text-sm font-medium text-black">{test.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {currentReport.recommendations.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-widest text-black/30">
                Recommendations ({currentReport.recommendations.length})
              </p>
              <div className="mt-3 divide-y divide-black/[0.06]">
                {currentReport.recommendations.map((rec) => (
                  <div key={rec.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-black">{rec.action}</p>
                          {rec.status !== 'pending' && (
                            <span
                              className={`text-xs font-medium ${
                                rec.status === 'approved' ? 'text-black/60' : 'text-black/30'
                              }`}
                            >
                              {rec.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-black/45">{rec.detail}</p>
                        <p className="mt-1 text-xs text-black/30">{rec.impact}</p>
                      </div>
                      {rec.status === 'pending' && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            disabled={actionLoading === rec.id}
                            onClick={() => handleApprove(rec.id)}
                            className="text-xs font-medium text-black border border-black/15 px-3 py-1.5 rounded hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {actionLoading === rec.id ? 'Wait...' : 'Approve'}
                          </button>
                          <button
                            disabled={actionLoading === rec.id}
                            onClick={() => handleReject(rec.id)}
                            className="text-xs font-medium text-black/45 border border-black/10 px-3 py-1.5 rounded hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {actionLoading === rec.id ? 'Wait...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Confirm Dialog — Human-in-the-Loop */}
      {approveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setApproveDialogOpen(false)}
          />
          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <h3 className="text-base font-semibold text-black">Confirm Action</h3>
            <p className="mt-2 text-sm text-black/45">
              You are about to approve an AI-recommended action. This will prepare a transaction for
              execution. Please review carefully before confirming.
            </p>

            {selectedRecId && currentReport && (() => {
              const rec = currentReport.recommendations.find((r) => r.id === selectedRecId);
              return rec ? (
                <div className="mt-4 rounded border border-black/[0.06] bg-black/[0.02] p-4">
                  <p className="text-sm font-medium text-black">{rec.action}</p>
                  <p className="mt-1 text-xs text-black/45">{rec.detail}</p>
                  <p className="mt-2 text-xs text-black/30">Expected: {rec.impact}</p>
                </div>
              ) : null;
            })()}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setApproveDialogOpen(false)}
                className="text-sm text-black/40 hover:text-black transition-colors px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={!!actionLoading}
                className="text-sm font-medium text-white bg-black px-4 py-1.5 rounded hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Confirming...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
