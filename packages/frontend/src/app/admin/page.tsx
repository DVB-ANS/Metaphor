'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleGate } from '@/components/role-gate';
import { type Role } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { TxStatusBanner } from '@/components/tx-status';
import { useAddToWhitelist, useGrantRole } from '@/hooks/use-adi-write';

export default function AdminPage() {
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({ address: '', label: '', role: '' });
  const [removeTarget, setRemoveTarget] = useState<{ address: string; label: string } | null>(null);
  const [configSaved, setConfigSaved] = useState(false);

  const { addToWhitelist, status: whitelistStatus, txHash: whitelistTxHash, error: whitelistError, reset: resetWhitelist } = useAddToWhitelist();
  const { grantRole, status: roleStatus, txHash: roleTxHash, error: roleError, reset: resetRole } = useGrantRole();

  // Step 2: after whitelist tx confirms, grant role if one was selected
  useEffect(() => {
    if (whitelistStatus === 'success' && walletForm.role && walletForm.address) {
      grantRole(walletForm.role, walletForm.address as `0x${string}`);
    }
  }, [whitelistStatus]);

  // Step 3: after role tx confirms (or whitelist if no role), update UI
  const finalStatus = walletForm.role ? roleStatus : whitelistStatus;
  useEffect(() => {
    if (finalStatus === 'success') {
      setWallets((prev) => [
        ...prev,
        {
          address: walletForm.address,
          label: walletForm.label,
          role: walletForm.role || 'investor',
          addedAt: new Date().toISOString().slice(0, 10),
          kycStatus: 'pending',
        },
      ]);
      const timer = setTimeout(() => {
        setAddWalletOpen(false);
        setWalletForm({ address: '', label: '', role: '' });
        resetWhitelist();
        resetRole();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [finalStatus]);

  const [whitelabelForm, setWhitelabelForm] = useState({
    institutionName: 'Metaphor',
    primaryColor: '#000000',
    domain: '',
  });

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/v1/admin/wallets')
      .then(setWallets)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddWallet = () => {
    resetWhitelist();
    resetRole();
    addToWhitelist(walletForm.address as `0x${string}`);
  };

  const walletSubmitting = whitelistStatus === 'pending' || whitelistStatus === 'confirming' || roleStatus === 'pending' || roleStatus === 'confirming';
  const walletTxError = whitelistError || roleError;
  const currentTxStatus = roleStatus !== 'idle' ? roleStatus : whitelistStatus;
  const currentTxHash = roleTxHash || whitelistTxHash;

  const roles = [
    {
      name: 'Admin',
      count: wallets.filter((w: any) => w.role === 'admin').length,
      permissions: ['Issue', 'Invest', 'Audit', 'Administer'],
      description: 'Full access to all platform features',
    },
    {
      name: 'Issuer',
      count: wallets.filter((w: any) => w.role === 'issuer').length,
      permissions: ['Issue'],
      description: 'Can tokenize and manage own assets',
    },
    {
      name: 'Investor',
      count: wallets.filter((w: any) => w.role === 'investor').length,
      permissions: ['Invest'],
      description: 'Can invest in vaults and view holdings',
    },
    {
      name: 'Auditor',
      count: wallets.filter((w: any) => w.role === 'auditor').length,
      permissions: ['Audit (limited)'],
      description: 'Read-only compliance access',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 items-center justify-center">
        <p className="text-sm text-black/30 animate-pulse">Loading admin data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-black/45">Failed to load admin data</p>
        <p className="text-xs text-black/30">{fetchError}</p>
      </div>
    );
  }

  return (
    <RoleGate allowed={['ADMIN']}>
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Header */}
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-2">ADI Chain</p>
          <h1 className="text-2xl font-semibold text-black">Administration</h1>
          <p className="mt-1 text-sm text-black/45">
            Role-based access control, wallet whitelist, and white-label config
          </p>
        </div>

        {/* RBAC Section */}
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-1">Roles & Permissions</p>
          <p className="text-xs text-black/30 mb-4">Managed by AccessControl.sol on ADI chain</p>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 border border-black/[0.06]">
            {roles.map((role, i) => (
              <div
                key={role.name}
                className={`p-4 bg-white ${i > 0 ? 'border-t lg:border-t-0 lg:border-l border-black/[0.06]' : ''} ${i === 2 ? 'sm:border-t sm:border-l-0 lg:border-l' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-black">{role.name}</p>
                  <span className="text-sm text-black/30">{role.count}</span>
                </div>
                <p className="text-xs text-black/30 mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <span key={perm} className="text-xs border border-black/[0.06] px-1.5 py-0.5 text-black/30">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Whitelist */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-1">Wallet Whitelist</p>
              <p className="text-xs text-black/30">KYC-validated wallets authorized to hold RWA tokens</p>
            </div>
            <Dialog open={addWalletOpen} onOpenChange={setAddWalletOpen}>
              <DialogTrigger asChild>
                <button className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors">
                  Add Wallet
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Wallet to Whitelist</DialogTitle>
                  <DialogDescription>
                    Add a KYC-verified wallet to the authorized whitelist on ADI AccessControl.
                  </DialogDescription>
                </DialogHeader>
                {currentTxStatus !== 'idle' && (
                  <TxStatusBanner
                    status={currentTxStatus}
                    txHash={currentTxHash}
                    error={walletTxError}
                    successMessage={walletForm.role ? 'Whitelisted and role granted.' : 'Wallet whitelisted.'}
                  />
                )}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-widest text-black/30">Wallet Address</label>
                    <input
                      className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                      placeholder="0x..."
                      value={walletForm.address}
                      onChange={(e) => setWalletForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-widest text-black/30">Label</label>
                    <input
                      className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                      placeholder="e.g. BlackRock Fund III"
                      value={walletForm.label}
                      onChange={(e) => setWalletForm((prev) => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-widest text-black/30">Role</label>
                    <Select value={walletForm.role} onValueChange={(v) => setWalletForm((prev) => ({ ...prev, role: v }))}>
                      <SelectTrigger className="border border-black/10 bg-transparent text-sm text-black">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investor">Investor</SelectItem>
                        <SelectItem value="issuer">Issuer</SelectItem>
                        <SelectItem value="auditor">Auditor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="border border-black text-black text-sm px-4 py-2 hover:bg-black/5 transition-colors"
                    onClick={() => setAddWalletOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors disabled:opacity-40"
                    onClick={handleAddWallet}
                    disabled={walletSubmitting || !walletForm.address}
                  >
                    {whitelistStatus === 'pending' ? 'Confirm whitelist...' : whitelistStatus === 'confirming' ? 'Confirming whitelist...' : roleStatus === 'pending' ? 'Confirm role grant...' : roleStatus === 'confirming' ? 'Confirming role...' : 'Add to Whitelist'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="text-left pb-2 text-xs font-medium uppercase tracking-widest text-black/30">Address</th>
                <th className="text-left pb-2 text-xs font-medium uppercase tracking-widest text-black/30">Label</th>
                <th className="text-left pb-2 text-xs font-medium uppercase tracking-widest text-black/30">Role</th>
                <th className="text-left pb-2 text-xs font-medium uppercase tracking-widest text-black/30">KYC</th>
                <th className="text-left pb-2 text-xs font-medium uppercase tracking-widest text-black/30">Added</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-black/30">
                    No whitelisted wallets found on-chain.
                  </td>
                </tr>
              ) : wallets.map((wallet: any) => (
                <tr key={wallet.address}>
                  <td className="py-3 pr-4 font-mono text-xs text-black/45">{wallet.address}</td>
                  <td className="py-3 pr-4 text-black">{wallet.label}</td>
                  <td className="py-3 pr-4">
                    <span className="text-xs border border-black/[0.06] px-2 py-0.5 text-black/45 capitalize">
                      {wallet.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {wallet.kycStatus === 'verified' ? (
                      <span className="text-xs px-2 py-0.5 border border-black/20 text-black/45">
                        Verified
                      </span>
                    ) : (
                      <button
                        className="text-xs px-2 py-0.5 border border-black/[0.06] text-black/30 hover:border-black hover:text-black transition-colors"
                        onClick={() => setWallets((prev) => prev.map((w: any) => w.address === wallet.address ? { ...w, kycStatus: 'verified' } : w))}
                      >
                        Pending — Verify
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-black/30">{wallet.addedAt}</td>
                  <td className="py-3">
                    <button
                      className="text-xs text-black/30 hover:text-black transition-colors"
                      onClick={() => setRemoveTarget({ address: wallet.address, label: wallet.label })}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* White-Label Configuration */}
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-1">White-Label Configuration</p>
          <p className="text-xs text-black/30 mb-6">Customize the platform for your institution (ADI bounty: white-label ready)</p>

          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-widest text-black/30">Institution Name</label>
              <input
                className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                value={whitelabelForm.institutionName}
                onChange={(e) => setWhitelabelForm((prev) => ({ ...prev, institutionName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-widest text-black/30">Custom Domain</label>
              <input
                className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                placeholder="vault.yourcompany.com"
                value={whitelabelForm.domain}
                onChange={(e) => setWhitelabelForm((prev) => ({ ...prev, domain: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-widest text-black/30">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={whitelabelForm.primaryColor}
                  onChange={(e) => setWhitelabelForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer border border-black/10 bg-transparent p-1"
                />
                <input
                  className="flex-1 border border-black/10 bg-transparent text-sm text-black px-3 py-2 font-mono outline-none focus:border-black/30"
                  value={whitelabelForm.primaryColor}
                  onChange={(e) => setWhitelabelForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-widest text-black/30">Logo</label>
              <div className="flex items-center gap-3 h-9">
                <button className="border border-black/10 text-black text-xs px-3 py-1.5 hover:border-black/30 transition-colors">
                  Upload Logo
                </button>
                <span className="text-xs text-black/30">PNG or SVG, max 2MB</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-black/[0.06] p-4 mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-black/30 mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: whitelabelForm.primaryColor }}
              >
                {whitelabelForm.institutionName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-base font-medium text-black">{whitelabelForm.institutionName}</span>
            </div>
          </div>

          <button
            className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors"
            onClick={() => setConfigSaved(true)}
          >
            Save Configuration
          </button>
          {configSaved && (
            <p className="mt-2 text-xs text-black/30">Configuration saved.</p>
          )}
        </div>
      </div>

      {/* Remove wallet confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Wallet</DialogTitle>
            <DialogDescription>
              Remove {removeTarget?.label} ({removeTarget?.address}) from the whitelist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="border border-black text-black text-sm px-4 py-2 hover:bg-black/5 transition-colors"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </button>
            <button
              className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors"
              onClick={() => {
                if (removeTarget) {
                  setWallets((prev) => prev.filter((w: any) => w.address !== removeTarget.address));
                }
                setRemoveTarget(null);
              }}
            >
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleGate>
  );
}
