'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
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
  mockVaults,
  mockPayments,
  mockAIReports,
  mockScoreHistory,
  formatCurrency,
  getRiskColor,
  getRiskBg,
  getStatusBadgeVariant,
  getAssetTypeLabel,
  type AIReport,
} from '@/lib/mock-data';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIReport | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  const vault = mockVaults.find((v) => v.id === id);
  if (!vault) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">Vault not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/vaults')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to vaults
        </Button>
      </div>
    );
  }

  const vaultPayments = mockPayments.filter((p) => p.vaultId === vault.id);
  const upcomingPayments = vaultPayments.filter((p) => p.status === 'scheduled');
  const pastPayments = vaultPayments.filter((p) => p.status === 'completed');
  const existingReport = mockAIReports.find((r) => r.vaultId === vault.id);
  const scoreHistory = mockScoreHistory[vault.id] || [];

  const allocationData = vault.assets.map((a) => ({
    name: a.name.length > 20 ? a.name.slice(0, 20) + '...' : a.name,
    value: a.allocation,
  }));

  const handleAnalyze = async () => {
    setAnalyzing(true);
    // Simulate 0G Compute inference delay
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setAnalysisResult(existingReport || null);
    setAnalyzing(false);
  };

  const handleApprove = (recId: string) => {
    setSelectedRecId(recId);
    setApproveDialogOpen(true);
  };

  const confirmAction = () => {
    // Mock — will be wired to backend in Phase 4
    setApproveDialogOpen(false);
    setSelectedRecId(null);
    alert('Action approved (mock). Will execute via backend bridge in Phase 4.');
  };

  const currentReport = analysisResult || existingReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vaults">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{vault.name}</h1>
              <Badge variant={getStatusBadgeVariant(vault.status)}>
                {vault.status === 'active'
                  ? 'Active'
                  : vault.status === 'attention'
                    ? 'Attention'
                    : 'Matured'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {vault.createdAt} &middot; {vault.assetCount} assets
            </p>
          </div>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" /> Analyze with AI
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">{formatCurrency(vault.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">YTD Return</p>
            <p className="text-2xl font-bold text-green-500">+{vault.yieldYTD}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Risk Score</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getRiskColor(vault.riskLevel)}`}>
                {vault.riskScore}/100
              </p>
            </div>
            <Progress value={vault.riskScore} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Upcoming Payments</p>
            <p className="text-2xl font-bold">{upcomingPayments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Asset Composition Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset Composition</CardTitle>
            <CardDescription>Breakdown of vault holdings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Allocation</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Coupon</TableHead>
                  <TableHead>Maturity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vault.assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getAssetTypeLabel(asset.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{asset.allocation}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{asset.rating}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{asset.couponRate}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.maturityDate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#aaa' }}
                  formatter={(value) => [`${value}%`, 'Allocation']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {vault.assets.map((asset, i) => (
                <div key={asset.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">
                      {asset.name.length > 25 ? asset.name.slice(0, 25) + '...' : asset.name}
                    </span>
                  </div>
                  <span className="font-medium">{asset.allocation}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Score History */}
      {scoreHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Risk Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreHistory}>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: 8 }}
                  formatter={(value) => [`${value}/100`, 'Risk Score']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {scoreHistory.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.score < 30
                          ? '#22c55e'
                          : entry.score < 60
                            ? '#eab308'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming payments</p>
            ) : (
              upcomingPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.assetName}</p>
                    <p className="text-xs text-muted-foreground">{p.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                    <Badge variant="outline" className="text-xs">
                      in {p.daysUntil}d
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Past Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past payments</p>
            ) : (
              pastPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.assetName}</p>
                    <p className="text-xs text-muted-foreground">{p.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                    <Badge variant="secondary" className="text-xs">
                      Completed
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Result */}
      {currentReport && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Risk Analysis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">0G Compute</Badge>
                  <span className={`text-lg font-bold ${getRiskColor(currentReport.riskLevel)}`}>
                    {currentReport.score}/100
                  </span>
                </div>
              </div>
              <CardDescription>{currentReport.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position Analysis */}
              <div>
                <p className="mb-3 text-sm font-medium">Position Analysis</p>
                <div className="space-y-2">
                  {currentReport.positionAnalysis.map((pos) => (
                    <div key={pos.name} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{pos.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${getRiskColor(pos.riskLevel)}`}>
                            {pos.score}/100
                          </span>
                          <div className={`h-2 w-2 rounded-full ${getRiskBg(pos.riskLevel)}`} />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{pos.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stress Tests */}
              <div>
                <p className="mb-3 text-sm font-medium">Stress Tests</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {currentReport.stressTests.map((test, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{test.scenario}</p>
                      <p className="text-sm font-bold text-red-400">{test.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations with Human-in-the-Loop */}
              {currentReport.recommendations.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium">
                    Recommendations ({currentReport.recommendations.length})
                  </p>
                  <div className="space-y-3">
                    {currentReport.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-start justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{rec.action}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>
                          <p className="mt-1 text-xs text-primary">{rec.impact}</p>
                        </div>
                        <div className="ml-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(rec.id)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Human-in-the-Loop Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              You are about to approve an AI-recommended action. This will prepare a transaction
              for execution. Please review carefully before confirming.
            </DialogDescription>
          </DialogHeader>
          {selectedRecId && currentReport && (
            <div className="rounded-lg border bg-muted/50 p-4">
              {(() => {
                const rec = currentReport.recommendations.find((r) => r.id === selectedRecId);
                return rec ? (
                  <>
                    <p className="font-medium">{rec.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>
                    <p className="mt-2 text-sm text-primary">Expected: {rec.impact}</p>
                  </>
                ) : null;
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>Confirm & Execute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
