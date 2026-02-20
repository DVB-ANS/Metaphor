'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BentoGrid, BentoCard } from '@/components/ui/magic-bento';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Vault, Search, ArrowUpRight } from 'lucide-react';
import {
  formatCurrency,
  getRiskColor,
  getStatusBadgeVariant,
  type RiskLevel,
  type VaultStatus,
  type AssetType,
} from '@/lib/mock-data';
import { api } from '@/lib/api';

export default function VaultsPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VaultStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');

  const [allVaults, setAllVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/demo/vaults')
      .then(setAllVaults)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BentoGrid className="space-y-6"><div className="flex h-64 items-center justify-center"><p className="text-sm text-neutral-500 animate-pulse">Loading vaults...</p></div></BentoGrid>;
  if (fetchError) return <BentoGrid className="space-y-6"><div className="flex h-64 flex-col items-center justify-center gap-2"><p className="text-sm text-red-400">Failed to load vaults</p><p className="text-xs text-neutral-600">{fetchError}</p></div></BentoGrid>;

  const filteredVaults = allVaults.filter((vault: any) => {
    if (search && !vault.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter !== 'all' && vault.riskLevel !== riskFilter) return false;
    if (statusFilter !== 'all' && vault.status !== statusFilter) return false;
    if (typeFilter !== 'all' && !vault.assets.some((a: any) => a.type === typeFilter)) return false;
    return true;
  });

  return (
    <BentoGrid className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Vaults</h1>
        <p className="text-muted-foreground">
          Manage your institutional vaults and monitor risk
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vaults..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as VaultStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="attention">Attention</SelectItem>
            <SelectItem value="matured">Matured</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AssetType | 'all')}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Asset type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="corporate-bond">Corporate Bond</SelectItem>
            <SelectItem value="sovereign-bond">Sovereign Bond</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="real-estate">Real Estate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredVaults.length === 0 ? (
        <BentoCard>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Vault className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No vaults match your filters</p>
          </CardContent>
        </BentoCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVaults.map((vault: any) => (
            <Link key={vault.id} href={`/vaults/${vault.id}`}>
              <BentoCard className="h-full cursor-pointer">
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
                  <div className="flex items-center gap-1 pt-2 text-xs text-primary">
                    View details <ArrowUpRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </BentoCard>
            </Link>
          ))}
        </div>
      )}
    </BentoGrid>
  );
}
