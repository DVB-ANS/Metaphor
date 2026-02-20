'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Timer,
} from 'lucide-react';
import { mockPayments, mockVaults, formatCurrency } from '@/lib/mock-data';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function YieldCalendarPage() {
  const [vaultFilter, setVaultFilter] = useState<string>('all');

  const payments = vaultFilter === 'all'
    ? mockPayments
    : mockPayments.filter((p) => p.vaultId === vaultFilter);

  const scheduled = payments.filter((p) => p.status === 'scheduled');
  const completed = payments.filter((p) => p.status === 'completed');

  const totalDistributed = completed.reduce((s, p) => s + p.amount, 0);
  const totalUpcoming = scheduled.reduce((s, p) => s + p.amount, 0);

  // Group payments by month for timeline
  const groupByMonth = (list: typeof payments) => {
    const groups: Record<string, typeof payments> = {};
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
    <div className="space-y-6">
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
            {mockVaults.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Distributed</p>
              <p className="text-xl font-bold">{formatCurrency(totalDistributed)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Timer className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalUpcoming)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Payments</p>
              <p className="text-xl font-bold">{completed.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled Payments</p>
              <p className="text-xl font-bold">{scheduled.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Timeline / List */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
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
                          {monthPayments.map((p) => (
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
                          {monthPayments.map((p) => (
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
          </Card>
        </TabsContent>

        {/* Upcoming List */}
        <TabsContent value="upcoming" className="space-y-3">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming payments
              </CardContent>
            </Card>
          ) : (
            scheduled.map((p) => (
              <Card key={p.id}>
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
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed List */}
        <TabsContent value="completed" className="space-y-3">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No completed payments
              </CardContent>
            </Card>
          ) : (
            completed.map((p) => (
              <Card key={p.id}>
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
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
