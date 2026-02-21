'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  formatCurrency,
  type RiskLevel,
  type VaultStatus,
  type AssetType,
} from '@/lib/mock-data';
import { api } from '@/lib/api';
import { RoleGate } from '@/components/role-gate';
import { TxStatusBanner } from '@/components/tx-status';
import { useCreateVault } from '@/hooks/use-adi-write';

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

function riskLabel(level: string | null | undefined): string {
  if (level === 'low') return 'Low';
  if (level === 'moderate') return 'Moderate';
  if (level === 'high') return 'High';
  return '--';
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'attention') return 'Attention';
  if (status === 'matured') return 'Matured';
  return status;
}

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
  const { createVault, status: vaultTxStatus, txHash: vaultTxHash, error: vaultTxError, reset: resetVaultTx, onChainVaultId } = useCreateVault();

  useEffect(() => {
    api.get<any[]>('/api/v1/vaults')
      .then(setAllVaults)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (vaultTxStatus === 'success') {
      // Persist vault metadata to backend so it survives page reload
      if (onChainVaultId != null) {
        api.post('/api/v1/vaults/meta', {
          onChainId: onChainVaultId,
          name: vaultForm.name,
          strategy: vaultForm.strategy,
          assetClass: vaultForm.assetClass,
          initialDeposit: vaultForm.initialDeposit,
          riskTolerance: vaultForm.riskTolerance,
          investmentHorizon: vaultForm.investmentHorizon,
          description: vaultForm.description,
        }).catch(() => { /* best-effort */ });
      }

      const riskMap: Record<string, { score: number; level: RiskLevel }> = {
        low: { score: 18, level: 'low' },
        moderate: { score: 42, level: 'moderate' },
        high: { score: 67, level: 'high' },
      };
      const risk = riskMap[vaultForm.riskTolerance] || riskMap.moderate;

      const newVault = {
        id: onChainVaultId != null ? `vault-${onChainVaultId}` : `vault-new-${Date.now()}`,
        name: vaultForm.name,
        totalValue: Number(vaultForm.initialDeposit) || 0,
        riskScore: risk.score,
        riskLevel: risk.level,
        status: 'active',
        assetCount: 0,
        yieldYTD: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        assets: [],
      };

      setAllVaults((prev) => [newVault, ...prev]);
      setVaultForm(initialVaultForm);
      const timer = setTimeout(() => {
        setCreateOpen(false);
        resetVaultTx();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [vaultTxStatus]);

  const handleFormChange = (field: keyof VaultForm, value: string) => {
    setVaultForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    resetVaultTx();
    createVault();
  };

  if (loading) {
    return (
      <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}>
        <div className="max-w-4xl mx-auto py-16 text-sm text-black/30 animate-pulse">
          Loading vaults...
        </div>
      </RoleGate>
    );
  }

  if (fetchError) {
    return (
      <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}>
        <div className="max-w-4xl mx-auto py-16 space-y-1">
          <p className="text-sm text-black/45">Failed to load vaults</p>
          <p className="text-xs text-black/30">{fetchError}</p>
        </div>
      </RoleGate>
    );
  }

  const filteredVaults = allVaults.filter((vault: any) => {
    if (search && !vault.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter !== 'all' && vault.riskLevel !== riskFilter) return false;
    if (statusFilter !== 'all' && vault.status !== statusFilter) return false;
    if (typeFilter !== 'all' && !vault.assets.some((a: any) => a.type === typeFilter)) return false;
    return true;
  });

  return (
    <RoleGate allowed={['ADMIN', 'ISSUER', 'INVESTOR']}>
    <div className="max-w-4xl mx-auto space-y-16 py-12">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-widest text-black/30">Vaults</p>
          <h1 className="text-2xl font-semibold text-black">My Vaults</h1>
          <p className="text-sm text-black/45">
            Manage your institutional vaults and monitor risk.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button className="text-sm font-medium text-black border border-black/20 px-4 py-2 hover:bg-black hover:text-white transition-colors">
              + Create Vault
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-none border border-black/10 bg-white p-8 shadow-none">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-black">
                Create New Vault
              </DialogTitle>
              <p className="text-sm text-black/45">
                Configure a new institutional vault. Assets can be allocated after creation via VaultManager.
              </p>
            </DialogHeader>

            <form className="mt-6 space-y-5" onSubmit={handleCreateVault}>
              {/* Vault Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                  Vault Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fixed Income EU"
                  value={vaultForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                  className="w-full border border-black/20 px-3 py-2 text-sm text-black placeholder:text-black/25 focus:border-black focus:outline-none"
                />
              </div>

              {/* Strategy + Asset Class */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                    Strategy
                  </label>
                  <select
                    value={vaultForm.strategy}
                    onChange={(e) => handleFormChange('strategy', e.target.value)}
                    className="w-full border border-black/20 px-3 py-2 text-sm text-black focus:border-black focus:outline-none appearance-none bg-white"
                  >
                    <option value="">Select strategy</option>
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                    Primary Asset Class
                  </label>
                  <select
                    value={vaultForm.assetClass}
                    onChange={(e) => handleFormChange('assetClass', e.target.value)}
                    className="w-full border border-black/20 px-3 py-2 text-sm text-black focus:border-black focus:outline-none appearance-none bg-white"
                  >
                    <option value="">Select asset class</option>
                    <option value="sovereign-bonds">Sovereign Bonds</option>
                    <option value="corporate-bonds">Corporate Bonds</option>
                    <option value="invoice-factoring">Invoice Factoring</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              {/* Initial Deposit + Risk Tolerance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                    Initial Deposit (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="1000000"
                    value={vaultForm.initialDeposit}
                    onChange={(e) => handleFormChange('initialDeposit', e.target.value)}
                    className="w-full border border-black/20 px-3 py-2 text-sm text-black placeholder:text-black/25 focus:border-black focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                    Risk Tolerance
                  </label>
                  <select
                    value={vaultForm.riskTolerance}
                    onChange={(e) => handleFormChange('riskTolerance', e.target.value)}
                    className="w-full border border-black/20 px-3 py-2 text-sm text-black focus:border-black focus:outline-none appearance-none bg-white"
                  >
                    <option value="">Select risk level</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Investment Horizon */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                  Investment Horizon
                </label>
                <select
                  value={vaultForm.investmentHorizon}
                  onChange={(e) => handleFormChange('investmentHorizon', e.target.value)}
                  className="w-full border border-black/20 px-3 py-2 text-sm text-black focus:border-black focus:outline-none appearance-none bg-white"
                >
                  <option value="">Select time horizon</option>
                  <option value="short">Short-term (&lt;2 years)</option>
                  <option value="medium">Medium-term (2-5 years)</option>
                  <option value="long">Long-term (5+ years)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">
                  Description (optional)
                </label>
                <textarea
                  placeholder="Investment thesis, target allocations, constraints..."
                  value={vaultForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-black/20 px-3 py-2 text-sm text-black placeholder:text-black/25 focus:border-black focus:outline-none resize-none"
                />
              </div>

              {/* Preview */}
              {vaultForm.name && vaultForm.initialDeposit && (
                <div className="border border-black/10 p-4 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-black/30">Preview</p>
                  <p className="text-sm font-semibold text-black">{vaultForm.name}</p>
                  <div className="flex items-center gap-4 text-xs text-black/35">
                    <span>{formatCurrency(Number(vaultForm.initialDeposit))} initial deposit</span>
                    {vaultForm.strategy && <span className="capitalize">{vaultForm.strategy} strategy</span>}
                    {vaultForm.riskTolerance && <span className="capitalize">{vaultForm.riskTolerance} risk</span>}
                  </div>
                </div>
              )}

              {vaultTxStatus !== 'idle' && (
                <TxStatusBanner
                  status={vaultTxStatus}
                  txHash={vaultTxHash}
                  error={vaultTxError}
                  successMessage="Vault created on-chain."
                />
              )}

              <button
                type="submit"
                disabled={vaultTxStatus === 'pending' || vaultTxStatus === 'confirming' || !vaultForm.name}
                className="w-full bg-black text-white text-sm font-medium py-2.5 hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {vaultTxStatus === 'pending' ? 'Confirm in wallet...' : vaultTxStatus === 'confirming' ? 'Confirming...' : 'Create Vault'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Filter</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search vaults..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] border border-black/10 px-3 py-2 text-sm text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none"
          />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
            className="border border-black/10 px-3 py-2 text-sm text-black focus:border-black/30 focus:outline-none appearance-none bg-white"
          >
            <option value="all">All risks</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VaultStatus | 'all')}
            className="border border-black/10 px-3 py-2 text-sm text-black focus:border-black/30 focus:outline-none appearance-none bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="attention">Attention</option>
            <option value="matured">Matured</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AssetType | 'all')}
            className="border border-black/10 px-3 py-2 text-sm text-black focus:border-black/30 focus:outline-none appearance-none bg-white"
          >
            <option value="all">All types</option>
            <option value="corporate-bond">Corporate Bond</option>
            <option value="sovereign-bond">Sovereign Bond</option>
            <option value="invoice">Invoice</option>
            <option value="real-estate">Real Estate</option>
          </select>
        </div>
      </div>

      {/* Vault List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Vault List</h2>
          {filteredVaults.length > 0 && (
            <span className="text-xs text-black/30">
              {filteredVaults.length} {filteredVaults.length === 1 ? 'vault' : 'vaults'}
            </span>
          )}
        </div>

        {allVaults.length === 0 ? (
          <div className="border border-black/[0.06] py-16 text-center">
            <p className="text-sm text-black/35">No vaults created yet.</p>
          </div>
        ) : filteredVaults.length === 0 ? (
          <div className="border border-black/[0.06] py-16 text-center">
            <p className="text-sm text-black/35">No vaults match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
            {filteredVaults.map((vault: any) => (
              <Link
                key={vault.id}
                href={`/vaults/${vault.id}`}
                className="flex items-center justify-between py-5 hover:bg-black/[0.02] transition-colors px-1 group"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{vault.name}</p>
                  <p className="text-xs text-black/35">
                    {vault.assetCount} {vault.assetCount === 1 ? 'asset' : 'assets'}
                    {vault.createdAt ? ` · Created ${vault.createdAt}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-10 shrink-0 ml-6">
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30">Value</p>
                    <p className="text-sm font-medium text-black">{formatCurrency(vault.totalValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30">YTD</p>
                    <p className="text-sm font-medium text-black">
                      {vault.yieldYTD != null ? `+${vault.yieldYTD}%` : '--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30">Risk</p>
                    <p className="text-sm font-medium text-black">
                      {vault.riskScore != null ? `${vault.riskScore}/100` : '--'}
                      {vault.riskLevel ? ` · ${riskLabel(vault.riskLevel)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-widest text-black/30">Status</p>
                    <p className="text-sm font-medium text-black">{statusLabel(vault.status)}</p>
                  </div>
                  <span className="text-black/30 group-hover:text-black transition-colors text-sm">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
    </RoleGate>
  );
}
