'use client';

import { useState, useEffect } from 'react';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BentoGrid, BentoCard } from '@/components/ui/magic-bento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import {
  getRiskColor,
  getRiskBg,
  type RiskLevel,
} from '@/lib/mock-data';
import { api } from '@/lib/api';
import { RoleGate } from '@/components/role-gate';

function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'low':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'moderate':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'high':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
}

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
        // Normalize backend fields (reportId→id, riskScore→score, createdAt→date)
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
      // Update local state
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

  if (loading) return <RoleGate allowed={['ADMIN', 'ISSUER', 'AUDITOR']}><BentoGrid className="space-y-6"><div className="flex h-64 items-center justify-center"><p className="text-sm text-neutral-500 animate-pulse">Loading AI reports...</p></div></BentoGrid></RoleGate>;
  if (fetchError) return <RoleGate allowed={['ADMIN', 'ISSUER', 'AUDITOR']}><BentoGrid className="space-y-6"><div className="flex h-64 flex-col items-center justify-center gap-2"><p className="text-sm text-red-400">Failed to load reports</p><p className="text-xs text-neutral-600">{fetchError}</p></div></BentoGrid></RoleGate>;

  return (
    <RoleGate allowed={['ADMIN', 'ISSUER', 'AUDITOR']}>
      <BentoGrid className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Reports</h1>
          <p className="text-muted-foreground">Risk analysis powered by 0G Compute</p>
        </div>
        <Select value={vaultFilter} onValueChange={setVaultFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by vault" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vaults</SelectItem>
            {vaults.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Score Evolution Chart */}
      {selectedHistory.length > 0 && (
        <BentoCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Risk Score Evolution
            </CardTitle>
            <CardDescription>
              {vaultFilter === 'all'
                ? 'Aggregate score trend across all vaults'
                : `Score trend for ${vaults.find((v: any) => v.id === vaultFilter)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={selectedHistory}>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{
                    background: '#1c1c1c',
                    border: '1px solid #333',
                    borderRadius: 8,
                  }}
                  formatter={(value) => [`${value}/100`, 'Risk Score']}
                />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label="" />
                <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" label="" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" /> Low (&lt;30)
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500" /> Moderate (30-60)
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" /> High (&gt;60)
              </div>
            </div>
          </CardContent>
        </BentoCard>
      )}

      {/* Reports */}
      {filteredReports.length === 0 ? (
        <BentoCard>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No AI reports yet. Trigger an analysis from a vault detail page.</p>
          </CardContent>
        </BentoCard>
      ) : (
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <BentoCard key={report.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{report.vaultName}</CardTitle>
                    <CardDescription>{report.date}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleExportPdf(report.id)}>
                    <Download className="mr-1 h-3 w-3" /> PDF
                  </Button>
                  <div className="flex items-center gap-2">
                    {getRiskIcon(report.riskLevel)}
                    <span className={`text-lg font-bold ${getRiskColor(report.riskLevel)}`}>
                      {report.score}/100
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{report.summary}</p>

              {/* Position Analysis */}
              <div>
                <p className="mb-2 text-sm font-medium">Position Analysis</p>
                <div className="space-y-2">
                  {report.positionAnalysis.map((pos: any) => (
                    <div
                      key={pos.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${getRiskBg(pos.riskLevel)}`} />
                        <div>
                          <p className="text-sm font-medium">{pos.name}</p>
                          <p className="text-xs text-muted-foreground">{pos.comment}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${getRiskColor(pos.riskLevel)}`}>
                        {pos.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stress Tests */}
              <div>
                <p className="mb-2 text-sm font-medium">Stress Tests</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {report.stressTests.map((test: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{test.scenario}</p>
                      <p className="text-sm font-bold text-red-400">{test.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations with Approve/Reject */}
              {report.recommendations.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Recommendations ({report.recommendations.length})
                  </p>
                  <div className="space-y-3">
                    {report.recommendations.map((rec: any) => {
                      const recStatus = rec.status === 'pending_approval' ? 'pending' : rec.status;
                      const recDetail = rec.description ?? rec.detail;
                      return (
                        <div
                          key={rec.id}
                          className="flex items-start justify-between rounded-lg border p-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{rec.action}</p>
                              {recStatus !== 'pending' && (
                                <Badge variant={recStatus === 'approved' ? 'default' : 'destructive'} className="text-xs">
                                  {recStatus}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{recDetail}</p>
                            <p className="mt-1 text-xs text-primary">{rec.impact}</p>
                          </div>
                          {recStatus === 'pending' && (
                            <RoleGate allowed={['ADMIN', 'ISSUER']} silent>
                            <div className="ml-4 flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={actionLoading === rec.id}
                                onClick={() => handleApproveClick(report, rec)}
                              >
                                {actionLoading === rec.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === rec.id}
                                onClick={() => handleReject(report, rec.id)}
                              >
                                {actionLoading === rec.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                Reject
                              </Button>
                            </div>
                            </RoleGate>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Badge variant="outline">0G Compute</Badge>
                {report.recommendations.length > 0 && (
                  <Badge variant="secondary">
                    {report.recommendations.length} action(s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </BentoCard>
        ))}
      </div>
      )}

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
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="font-medium">{approveDialog.action}</p>
            <p className="mt-1 text-sm text-muted-foreground">{approveDialog.detail}</p>
            <p className="mt-2 text-sm text-primary">Expected: {approveDialog.impact}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={!!actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : (
                'Confirm & Execute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </BentoGrid>
    </RoleGate>
  );
}
