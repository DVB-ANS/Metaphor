'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import type { RiskLevel } from '@/lib/mock-data';
import { api } from '@/lib/api';

export default function AIReportsPage() {
  const [vaultFilter, setVaultFilter] = useState<string>('all');
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    reportId: string;
    recId: string;
    action: string;
    detail: string;
    impact: string;
  }>({ open: false, reportId: '', recId: '', action: '', detail: '', impact: '' });

  const [reports, setReports] = useState<any[]>([]);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/api/v1/ai/reports'),
      api.get<any[]>('/api/v1/ai/score-history'),
      api.get<any[]>('/api/v1/vaults'),
    ])
      .then(([reportsData, historyData, vaultsData]) => {
        setReports(reportsData.map((r: any) => ({
          ...r,
          id: r.reportId ?? r.id,
          score: r.riskScore ?? r.score,
          date: r.createdAt ?? r.date,
          vaultName: r.vaultName || r.vaultId || '',
        })));
        setScoreHistory(historyData);
        setVaults(vaultsData);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const historyUrl = vaultFilter === 'all' ? '/api/v1/ai/score-history' : `/api/v1/ai/score-history?vaultId=${vaultFilter}`;
    api.get<any[]>(historyUrl).then(setScoreHistory).catch(() => {});
  }, [vaultFilter]);

  const filteredReports =
    vaultFilter === 'all'
      ? reports
      : reports.filter((r) => r.vaultId === vaultFilter);

  const selectedHistory = scoreHistory;

  const handleExportPdf = (reportId: string) => {
    alert(`PDF export for report ${reportId} (mock). Will be implemented with a PDF library.`);
  };

  const handleApproveClick = (report: any, rec: any) => {
    setApproveDialog({
      open: true,
      reportId: report.reportId ?? report.id,
      recId: rec.id,
      action: rec.action,
      detail: rec.description ?? rec.detail,
      impact: rec.impact,
    });
  };

  const confirmApprove = async () => {
    const { reportId, recId } = approveDialog;
    setActionLoading(recId);
    try {
      await api.post(`/api/ai/reports/${reportId}/approve`, {
        recommendationId: recId,
      });
      setReports((prev) =>
        prev.map((r) => {
          const rid = r.reportId ?? r.id;
          if (rid !== reportId) return r;
          return {
            ...r,
            recommendations: r.recommendations.map((rec: any) =>
              rec.id === recId ? { ...rec, status: 'approved' } : rec,
            ),
          };
        }),
      );
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    } finally {
      setActionLoading(null);
      setApproveDialog((prev) => ({ ...prev, open: false }));
    }
  };

  const handleReject = async (report: any, recId: string) => {
    const reportId = report.reportId ?? report.id;
    setActionLoading(recId);
    try {
      await api.post(`/api/ai/reports/${reportId}/reject`, {
        recommendationId: recId,
      });
      setReports((prev) =>
        prev.map((r) => {
          const rid = r.reportId ?? r.id;
          if (rid !== reportId) return r;
          return {
            ...r,
            recommendations: r.recommendations.map((rec: any) =>
              rec.id === recId ? { ...rec, status: 'rejected' } : rec,
            ),
          };
        }),
      );
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 items-center justify-center">
        <p className="text-sm text-black/30 animate-pulse">Loading AI reports...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-black/45">Failed to load reports</p>
        <p className="text-xs text-black/30">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-2">0G Compute</p>
          <h1 className="text-2xl font-semibold text-black">AI Reports</h1>
          <p className="mt-1 text-sm text-black/45">Risk analysis powered by 0G Compute</p>
        </div>
        <Select value={vaultFilter} onValueChange={setVaultFilter}>
          <SelectTrigger className="w-[180px] border border-black/10 bg-transparent text-sm text-black">
            <SelectValue placeholder="Filter by vault" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vaults</SelectItem>
            {vaults.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Score Evolution Chart */}
      {selectedHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-4">Risk Score Evolution</p>
          <p className="text-xs text-black/30 mb-4">
            {vaultFilter === 'all'
              ? 'Aggregate score trend across all vaults'
              : `Score trend for ${vaults.find((v: any) => v.id === vaultFilter)?.name}`}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={selectedHistory}>
              <XAxis dataKey="date" tick={{ fill: '#00000066', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#00000066', fontSize: 11 }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 0,
                  fontSize: 12,
                  color: '#000',
                }}
                formatter={(value) => [`${value}/100`, 'Risk Score']}
              />
              <ReferenceLine y={30} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#000"
                strokeWidth={1.5}
                dot={{ fill: '#000', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-6 text-xs text-black/30">
            <span>Low (&lt;30)</span>
            <span>Moderate (30–60)</span>
            <span>High (&gt;60)</span>
          </div>
        </div>
      )}

      {/* Reports */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-4">Reports</p>

        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-black/[0.06]">
            <p className="text-sm text-black/30">No AI reports yet. Trigger an analysis from a vault detail page.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredReports.map((report) => (
              <div key={report.id} className="space-y-8">
                {/* Report header */}
                <div className="flex items-start justify-between border-b border-black/[0.06] pb-4">
                  <div>
                    <h2 className="text-base font-medium text-black">{report.vaultName}</h2>
                    <p className="text-xs text-black/30 mt-0.5">{report.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="border border-black/10 text-black text-xs px-3 py-1.5 hover:border-black/30 transition-colors"
                      onClick={() => handleExportPdf(report.id)}
                    >
                      Export PDF
                    </button>
                    <span className="text-lg font-medium text-black">
                      {report.score}/100
                    </span>
                  </div>
                </div>

                <p className="text-sm text-black/45">{report.summary}</p>

                {/* Position Analysis */}
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-3">Position Analysis</p>
                  <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                    {report.positionAnalysis.map((pos: any) => (
                      <div key={pos.name} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                          <div>
                            <p className="text-sm text-black">{pos.name}</p>
                            <p className="text-xs text-black/30">{pos.comment}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-black">
                          {pos.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stress Tests */}
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-3">Stress Tests</p>
                  <div className="grid gap-px sm:grid-cols-3 border border-black/[0.06]">
                    {report.stressTests.map((test: any, i: number) => (
                      <div key={i} className={`p-4 bg-white ${i > 0 ? 'border-t sm:border-t-0 sm:border-l border-black/[0.06]' : ''}`}>
                        <p className="text-xs text-black/30">{test.scenario}</p>
                        <p className="mt-1 text-sm font-medium text-black/45">{test.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {report.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-3">
                      Recommendations ({report.recommendations.length})
                    </p>
                    <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                      {report.recommendations.map((rec: any) => {
                        const recStatus = rec.status === 'pending_approval' ? 'pending' : rec.status;
                        const recDetail = rec.description ?? rec.detail;
                        return (
                          <div key={rec.id} className="py-4 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="text-sm font-medium text-black">{rec.action}</p>
                                {recStatus !== 'pending' && (
                                  <span className={`text-xs px-2 py-0.5 border ${recStatus === 'approved' ? 'border-black/20 text-black/45' : 'border-black/10 text-black/30'}`}>
                                    {recStatus}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-black/45">{recDetail}</p>
                              <p className="mt-1 text-xs text-black/30">{rec.impact}</p>
                            </div>
                            {recStatus === 'pending' && (
                              <div className="flex gap-2 shrink-0">
                                <button
                                  className="bg-black text-white text-xs px-3 py-1.5 hover:bg-black/80 transition-colors disabled:opacity-40"
                                  disabled={actionLoading === rec.id}
                                  onClick={() => handleApproveClick(report, rec)}
                                >
                                  {actionLoading === rec.id ? 'Loading...' : 'Approve'}
                                </button>
                                <button
                                  className="border border-black/10 text-black text-xs px-3 py-1.5 hover:border-black/30 transition-colors disabled:opacity-40"
                                  disabled={actionLoading === rec.id}
                                  onClick={() => handleReject(report, rec.id)}
                                >
                                  {actionLoading === rec.id ? 'Loading...' : 'Reject'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <span className="text-xs border border-black/[0.06] px-2 py-0.5 text-black/30">0G Compute</span>
                  {report.recommendations.length > 0 && (
                    <span className="text-xs border border-black/[0.06] px-2 py-0.5 text-black/30">
                      {report.recommendations.length} action(s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm AI Recommendation</DialogTitle>
            <DialogDescription>
              You are about to approve an AI-recommended action. This will prepare a transaction.
              Review carefully before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-black/[0.06] p-4 bg-black/[0.02]">
            <p className="text-sm font-medium text-black">{approveDialog.action}</p>
            <p className="mt-1 text-sm text-black/45">{approveDialog.detail}</p>
            <p className="mt-2 text-xs text-black/30">Expected: {approveDialog.impact}</p>
          </div>
          <DialogFooter>
            <button
              className="border border-black/10 text-black text-sm px-4 py-2 hover:border-black/30 transition-colors"
              onClick={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </button>
            <button
              className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors disabled:opacity-40"
              onClick={confirmApprove}
              disabled={!!actionLoading}
            >
              {actionLoading ? 'Confirming...' : 'Confirm & Execute'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
