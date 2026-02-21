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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GooeyNav } from '@/components/ui/gooey-nav';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Timer,
} from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { RoleGate } from '@/components/role-gate';

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

  if (loading) return <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}><BentoGrid className="space-y-6"><div className="flex h-64 items-center justify-center"><p className="text-sm text-neutral-500 animate-pulse">Loading yield calendar...</p></div></BentoGrid></RoleGate>;
  if (error) return <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}><BentoGrid className="space-y-6"><div className="flex h-64 flex-col items-center justify-center gap-2"><p className="text-sm text-red-400">Failed to load data</p><p className="text-xs text-neutral-600">{error}</p></div></BentoGrid></RoleGate>;

  if (allPayments.length === 0) {
    return (
      <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}>
      <BentoGrid className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yield Calendar</h1>
          <p className="text-muted-foreground">Automated coupon payments via Hedera Schedule Service</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No coupon payments scheduled yet.</p>
        </div>
      </BentoGrid>
      </RoleGate>
    );
  }

  const filteredPayments = vaultFilter === 'all'
    ? allPayments
    : allPayments.filter((p: any) => p.vaultId === vaultFilter);

  const scheduled = filteredPayments.filter((p: any) => p.status === 'scheduled');
  const completed = filteredPayments.filter((p: any) => p.status === 'completed');

  const totalDistributed = completed.reduce((s: number, p: any) => s + p.amount, 0);
  const totalUpcoming = scheduled.reduce((s: number, p: any) => s + p.amount, 0);

  // Group payments by month for timeline
  const groupByMonth = (list: typeof filteredPayments) => {
    const groups: Record<string, typeof filteredPayments> = {};
    for (const p of list) {
      const key = p.date.slice(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const scheduledByMonth = groupByMonth(scheduled);
  const completedByMonth = groupByMonth(completed);

  return (
    <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}>
      <BentoGrid className="space-y-6">
        <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yield Calendar</h1>
          <p className="text-muted-foreground">
            Automated coupon payments via Hedera Schedule Service
          </p>
        </div>
        <Select value={vaultFilter} onValueChange={setVaultFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by vault" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vaults</SelectItem>
            {vaults.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <BentoCard>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Distributed</p>
              <p className="text-xl font-bold">{formatCurrency(totalDistributed)}</p>
            </div>
          </CardContent>
        </BentoCard>
        <BentoCard>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Timer className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalUpcoming)}</p>
            </div>
          </CardContent>
        </BentoCard>
        <BentoCard>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Payments</p>
              <p className="text-xl font-bold">{completed.length}</p>
            </div>
          </CardContent>
        </BentoCard>
        <BentoCard>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled Payments</p>
              <p className="text-xl font-bold">{scheduled.length}</p>
            </div>
          </CardContent>
        </BentoCard>
      </div>

      {/* Tab Selector */}
      <GooeyNav
        items={[
          { label: 'Timeline', value: 'timeline' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Completed', value: 'completed' },
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
      />

      {/* Timeline View */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <BentoCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Payment Timeline
              </CardTitle>
              <CardDescription>All scheduled and completed coupon distributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {/* Completed */}
                {completedByMonth.map(([monthKey, monthPayments]) => {
                  const [year, month] = monthKey.split('-');
                  return (
                    <div key={monthKey} className="relative flex gap-4 pb-6">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="w-px flex-1 bg-border" />
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">
                          {months[parseInt(month) - 1]} {year}
                        </p>
                        <div className="mt-2 space-y-2">
                          {monthPayments.map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">{p.assetName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.vaultName} &middot; {p.recipients} recipients
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                                <Badge variant="secondary" className="text-xs">
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Now marker */}
                <div className="relative flex gap-4 pb-6">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <Clock className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex items-center">
                    <Badge>Now — Feb 2026</Badge>
                  </div>
                </div>

                {/* Upcoming */}
                {scheduledByMonth.map(([monthKey, monthPayments]) => {
                  const [year, month] = monthKey.split('-');
                  return (
                    <div key={monthKey} className="relative flex gap-4 pb-6">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-primary/50">
                          <Timer className="h-4 w-4 text-primary/50" />
                        </div>
                        <div className="w-px flex-1 bg-border/50" />
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">
                          {months[parseInt(month) - 1]} {year}
                        </p>
                        <div className="mt-2 space-y-2">
                          {monthPayments.map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-lg border border-dashed p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">{p.assetName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.vaultName} &middot; {p.recipients} recipients
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                                <Badge variant="outline" className="text-xs">
                                  in {p.daysUntil}d
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </BentoCard>
        </div>
      )}

      {/* Upcoming List */}
      {activeTab === 'upcoming' && (
        <div className="space-y-3">
          {scheduled.length === 0 ? (
            <BentoCard>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming payments
              </CardContent>
            </BentoCard>
          ) : (
            scheduled.map((p: any) => (
              <BentoCard key={p.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-medium">{p.assetName}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.vaultName} &middot; {p.date} &middot; {p.recipients} recipients
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(p.amount)}</p>
                    <Badge variant="outline">in {p.daysUntil} days</Badge>
                  </div>
                </CardContent>
              </BentoCard>
            ))
          )}
        </div>
      )}

      {/* Completed List */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completed.length === 0 ? (
            <BentoCard>
              <CardContent className="py-12 text-center text-muted-foreground">
                No completed payments
              </CardContent>
            </BentoCard>
          ) : (
            completed.map((p: any) => (
              <BentoCard key={p.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-medium">{p.assetName}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.vaultName} &middot; {p.date} &middot; {p.recipients} recipients
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(p.amount)}</p>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                </CardContent>
              </BentoCard>
            ))
          )}
        </div>
      )}
      </BentoGrid>
    </RoleGate>
  );
}
