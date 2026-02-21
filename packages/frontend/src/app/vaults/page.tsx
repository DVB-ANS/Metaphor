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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Vault, Search, ArrowUpRight, Plus } from 'lucide-react';
import {
  formatCurrency,
  getRiskColor,
  getStatusBadgeVariant,
  type RiskLevel,
  type VaultStatus,
  type AssetType,
} from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-neutral-400 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex w-full flex-col space-y-2', className)}>
    {children}
  </div>
);

interface VaultForm {
  name: string;
  strategy: string;
  assetClass: string;
  initialDeposit: string;
  riskTolerance: string;
  investmentHorizon: string;
  description: string;
}

const initialVaultForm: VaultForm = {
  name: '',
  strategy: '',
  assetClass: '',
  initialDeposit: '',
  riskTolerance: '',
  investmentHorizon: '',
  description: '',
};

export default function VaultsPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VaultStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');

  const [allVaults, setAllVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [vaultForm, setVaultForm] = useState<VaultForm>(initialVaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<any[]>('/api/v1/vaults')
      .then(setAllVaults)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFormChange = (field: keyof VaultForm, value: string) => {
    setVaultForm((prev) => ({ ...prev, [field]: value }));
  };

  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const result = await api.post<{ txHash: string; vaultId: string }>('/api/adi/vaults');

      const newVault = {
        id: `vault-${result.vaultId}`,
        onChainId: Number(result.vaultId),
        name: vaultForm.name || `Vault #${result.vaultId}`,
        totalValue: 0,
        riskScore: null,
        riskLevel: null,
        status: 'active',
        assetCount: 0,
        yieldYTD: null,
        createdAt: new Date().toISOString().slice(0, 10),
        assets: [],
      };

      setAllVaults((prev) => [newVault, ...prev]);
      setVaultForm(initialVaultForm);
      setCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create vault. Make sure you are signed in with ISSUER role.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Vaults</h1>
          <p className="text-muted-foreground">
            Manage your institutional vaults and monitor risk
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Vault
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                Create New Vault
              </DialogTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Configure a new institutional vault. Assets can be allocated after creation via VaultManager.
              </p>
            </DialogHeader>

            {createError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{createError}</p>
              </div>
            )}

            <form className="my-4 space-y-0" onSubmit={handleCreateVault}>
              {/* Vault Name */}
              <LabelInputContainer className="mb-4">
                <Label htmlFor="vaultName">Vault Name</Label>
                <div className="group/btn relative overflow-hidden">
                  <Input
                    id="vaultName"
                    placeholder="e.g. Fixed Income EU"
                    value={vaultForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                    className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                  />
                  <BottomGradient />
                </div>
              </LabelInputContainer>

              {/* Strategy + Asset Class */}
              <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                <LabelInputContainer>
                  <Label htmlFor="strategy">Strategy</Label>
                  <div className="group/btn relative overflow-hidden">
                    <Select
                      value={vaultForm.strategy}
                      onValueChange={(v) => handleFormChange('strategy', v)}
                    >
                      <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                      </SelectContent>
                    </Select>
                    <BottomGradient />
                  </div>
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="assetClass">Primary Asset Class</Label>
                  <div className="group/btn relative overflow-hidden">
                    <Select
                      value={vaultForm.assetClass}
                      onValueChange={(v) => handleFormChange('assetClass', v)}
                    >
                      <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                        <SelectValue placeholder="Select asset class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sovereign-bonds">Sovereign Bonds</SelectItem>
                        <SelectItem value="corporate-bonds">Corporate Bonds</SelectItem>
                        <SelectItem value="invoice-factoring">Invoice Factoring</SelectItem>
                        <SelectItem value="real-estate">Real Estate</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <BottomGradient />
                  </div>
                </LabelInputContainer>
              </div>

              {/* Initial Deposit + Risk Tolerance */}
              <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                <LabelInputContainer>
                  <Label htmlFor="initialDeposit">Initial Deposit (USD)</Label>
                  <div className="group/btn relative overflow-hidden">
                    <Input
                      id="initialDeposit"
                      type="number"
                      placeholder="1000000"
                      value={vaultForm.initialDeposit}
                      onChange={(e) => handleFormChange('initialDeposit', e.target.value)}
                      className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                    />
                    <BottomGradient />
                  </div>
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <div className="group/btn relative overflow-hidden">
                    <Select
                      value={vaultForm.riskTolerance}
                      onValueChange={(v) => handleFormChange('riskTolerance', v)}
                    >
                      <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <BottomGradient />
                  </div>
                </LabelInputContainer>
              </div>

              {/* Investment Horizon */}
              <LabelInputContainer className="mb-4">
                <Label htmlFor="investmentHorizon">Investment Horizon</Label>
                <div className="group/btn relative overflow-hidden">
                  <Select
                    value={vaultForm.investmentHorizon}
                    onValueChange={(v) => handleFormChange('investmentHorizon', v)}
                  >
                    <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                      <SelectValue placeholder="Select time horizon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short-term (&lt;2 years)</SelectItem>
                      <SelectItem value="medium">Medium-term (2-5 years)</SelectItem>
                      <SelectItem value="long">Long-term (5+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                  <BottomGradient />
                </div>
              </LabelInputContainer>

              {/* Description */}
              <LabelInputContainer className="mb-8">
                <Label htmlFor="vaultDescription">Description (optional)</Label>
                <div className="group/btn relative overflow-hidden">
                  <Textarea
                    id="vaultDescription"
                    placeholder="Investment thesis, target allocations, constraints..."
                    value={vaultForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                    className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                  />
                  <BottomGradient />
                </div>
              </LabelInputContainer>

              {/* Vault Preview */}
              {vaultForm.name && vaultForm.initialDeposit && (
                <>
                  <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
                  <div className="mb-8 rounded-lg bg-gray-50 p-4 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Vault Preview</p>
                    <p className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                      {vaultForm.name}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>
                        {formatCurrency(Number(vaultForm.initialDeposit))} initial deposit
                      </span>
                      {vaultForm.strategy && (
                        <span className="capitalize">{vaultForm.strategy} strategy</span>
                      )}
                      {vaultForm.riskTolerance && (
                        <span className="capitalize">{vaultForm.riskTolerance} risk</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <button
                className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
                type="submit"
                disabled={isSubmitting || !vaultForm.name}
              >
                {isSubmitting ? 'Creating Vault...' : 'Create Vault \u2192'}
                <BottomGradient />
              </button>
            </form>
          </DialogContent>
        </Dialog>
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
      {allVaults.length === 0 ? (
        <BentoCard>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Vault className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No vaults created yet.</p>
          </CardContent>
        </BentoCard>
      ) : filteredVaults.length === 0 ? (
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
                      {vault.yieldYTD != null ? `+${vault.yieldYTD}%` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className={`text-sm font-bold ${getRiskColor(vault.riskLevel)}`}>
                      {vault.riskScore != null ? `${vault.riskScore}/100` : '--'}
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
