import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Vault,
  TrendingUp,
  Coins,
  CalendarClock,
  Brain,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  mockVaults,
  mockPayments,
  mockAIAnalysis,
  mockPortfolioStats,
  formatCurrency,
  getRiskColor,
  getStatusBadgeVariant,
} from '@/lib/mock-data';

const stats = [
  {
    label: 'Total Asset Value',
    value: formatCurrency(mockPortfolioStats.totalValue),
    icon: Coins,
  },
  {
    label: 'YTD Return',
    value: `+${mockPortfolioStats.yieldYTD}%`,
    icon: TrendingUp,
  },
  {
    label: 'Active Vaults',
    value: mockPortfolioStats.activeVaults.toString(),
    icon: Vault,
  },
  {
    label: 'Tokenized Assets',
    value: mockPortfolioStats.tokenizedAssets.toString(),
    icon: Coins,
  },
  {
    label: 'Upcoming Payments',
    value: mockPortfolioStats.upcomingPayments.toString(),
    icon: CalendarClock,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Portfolio overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vaults List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Vaults</CardTitle>
              <CardDescription>Your active institutional vaults</CardDescription>
            </div>
            <Link
              href="/vaults"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockVaults.map((vault) => (
                <Link
                  key={vault.id}
                  href={`/vaults/${vault.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Vault className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{vault.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {vault.assetCount} assets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(vault.totalValue)}</p>
                      <p className="text-sm text-green-500">+{vault.yieldYTD}%</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getRiskColor(vault.riskLevel)}`}>
                        Risk: {vault.riskScore}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(vault.status)}>
                      {vault.status === 'active'
                        ? 'Active'
                        : vault.status === 'attention'
                          ? 'Attention'
                          : 'Matured'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Next Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockPayments.filter((p) => p.status === 'scheduled').slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{payment.assetName}</p>
                    <p className="text-xs text-muted-foreground">{payment.vaultName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      in {payment.daysUntil} days
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Last AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Last AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{mockAIAnalysis.vaultName}</p>
                  <p className={`text-sm font-bold ${getRiskColor(mockAIAnalysis.riskLevel)}`}>
                    Score: {mockAIAnalysis.score}/100
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockAIAnalysis.recommendations} recommendation(s) pending
                </p>
                <Link
                  href="/ai-reports"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View report <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
