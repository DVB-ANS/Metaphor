import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vault } from 'lucide-react';
import {
  mockVaults,
  formatCurrency,
  getRiskColor,
  getStatusBadgeVariant,
} from '@/lib/mock-data';

export default function VaultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Vaults</h1>
        <p className="text-muted-foreground">
          Manage your institutional vaults and monitor risk
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockVaults.map((vault) => (
          <Card key={vault.id} className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Vault className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{vault.name}</CardTitle>
                  <CardDescription>{vault.assetCount} assets</CardDescription>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(vault.status)}>
                {vault.status === 'active'
                  ? 'Active'
                  : vault.status === 'attention'
                    ? 'Attention'
                    : 'Matured'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-lg font-bold">{formatCurrency(vault.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">YTD Return</span>
                <span className="text-sm font-medium text-green-500">
                  +{vault.yieldYTD}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span className={`text-sm font-bold ${getRiskColor(vault.riskLevel)}`}>
                  {vault.riskScore}/100
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
