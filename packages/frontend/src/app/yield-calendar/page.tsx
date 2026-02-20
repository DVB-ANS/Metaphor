import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { mockUpcomingPayments, formatCurrency } from '@/lib/mock-data';

const pastPayments = [
  {
    id: 'past-1',
    assetName: 'BondToken-ACME-2026',
    amount: 25_000,
    date: '2025-08-15',
    status: 'completed' as const,
    vaultName: 'Fixed Income EU',
  },
  {
    id: 'past-2',
    assetName: 'TreasuryBond-US-2027',
    amount: 18_500,
    date: '2025-09-15',
    status: 'completed' as const,
    vaultName: 'US Treasury Pool',
  },
];

export default function YieldCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yield Calendar</h1>
        <p className="text-muted-foreground">
          Automated coupon payments via Hedera Schedule Service
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>Scheduled coupon distributions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockUpcomingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{payment.assetName}</p>
                  <p className="text-sm text-muted-foreground">{payment.vaultName}</p>
                  <p className="text-xs text-muted-foreground">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(payment.amount)}</p>
                  <Badge variant="outline">in {payment.daysUntil} days</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Past Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Past Payments
            </CardTitle>
            <CardDescription>Completed coupon distributions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{payment.assetName}</p>
                  <p className="text-sm text-muted-foreground">{payment.vaultName}</p>
                  <p className="text-xs text-muted-foreground">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(payment.amount)}</p>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
