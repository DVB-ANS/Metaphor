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
import {
  formatCurrency,
  getTradeStatusVariant,
  type VisibilityLevel,
} from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { RoleGate } from '@/components/role-gate';

function getVisibilityDescription(role: VisibilityLevel): string {
  switch (role) {
    case 'owner':
      return 'Full access — can modify vault, accept/reject trades';
    case 'counterparty':
      return 'Can view composition and propose trades';
    case 'auditor':
      return 'Read-only compliance view (limited data)';
  }
}

export default function DataRoomPage() {
  const { hasRole, isAuthenticated } = useAuth();
  const isAuditorOnly = isAuthenticated && hasRole('AUDITOR') && !hasRole('ADMIN') && !hasRole('ISSUER') && !hasRole('INVESTOR');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ vaultId: '', publicKey: '', name: '', role: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [confidentialVaults, setConfidentialVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tradeLoading, setTradeLoading] = useState<string | null>(null);

  const updateTradeStatus = (vaultId: string, tradeId: string, status: string) => {
    setConfidentialVaults((prev) =>
      prev.map((v: any) =>
        v.id === vaultId
          ? {
              ...v,
              trades: v.trades.map((t: any) =>
                t.id === tradeId ? { ...t, status } : t
              ),
            }
          : v
      )
    );
  };

  useEffect(() => {
    api.get<any[]>('/api/v1/canton/vaults')
      .then(setConfidentialVaults)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      await api.post(`/api/canton/vaults/${inviteForm.vaultId}/invite`, {
        to: inviteForm.publicKey,
        role: inviteForm.role,
      });
      setInviteOpen(false);
      setInviteForm({ vaultId: '', publicKey: '', name: '', role: '' });
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation. Canton may not be configured.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleTradeAccept = async (tradeId: string) => {
    setTradeLoading(tradeId);
    try {
      await api.post(`/api/canton/trades/${tradeId}/accept`);
      setConfidentialVaults((prev) =>
        prev.map((cv) => ({
          ...cv,
          trades: cv.trades.map((t: any) =>
            t.id === tradeId ? { ...t, status: 'accepted' } : t,
          ),
        })),
      );
    } catch (err: any) {
      alert(`Accept failed: ${err.message}. Canton may not be configured.`);
    } finally {
      setTradeLoading(null);
    }
  };

  const handleTradeReject = async (tradeId: string) => {
    setTradeLoading(tradeId);
    try {
      await api.post(`/api/canton/trades/${tradeId}/reject`);
      setConfidentialVaults((prev) =>
        prev.map((cv) => ({
          ...cv,
          trades: cv.trades.map((t: any) =>
            t.id === tradeId ? { ...t, status: 'rejected' } : t,
          ),
        })),
      );
    } catch (err: any) {
      alert(`Reject failed: ${err.message}. Canton may not be configured.`);
    } finally {
      setTradeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 items-center justify-center">
        <p className="text-sm text-black/30 animate-pulse">Loading data room...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-black/45">Failed to load data room</p>
        <p className="text-xs text-black/30">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-2">Canton Network</p>
          <h1 className="text-2xl font-semibold text-black">Data Room</h1>
          <p className="mt-1 text-sm text-black/45">Confidential vaults with party-scoped visibility</p>
        </div>
        <RoleGate allowed={['ADMIN', 'ISSUER']} silent>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <button className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors">
              Invite Party
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Party</DialogTitle>
              <DialogDescription>
                Add a counterparty or auditor to a confidential vault. They will only see data
                according to their visibility level.
              </DialogDescription>
            </DialogHeader>
            {inviteError && (
              <div className="border border-black/10 bg-black/5 p-3">
                <p className="text-sm text-black/45">{inviteError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">Vault</label>
                <Select value={inviteForm.vaultId} onValueChange={(v) => setInviteForm((prev) => ({ ...prev, vaultId: v }))}>
                  <SelectTrigger className="border border-black/10 bg-transparent text-sm text-black">
                    <SelectValue placeholder="Select vault" />
                  </SelectTrigger>
                  <SelectContent>
                    {confidentialVaults.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">Canton Public Key</label>
                <input
                  className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                  placeholder="0x..."
                  value={inviteForm.publicKey}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">Institution Name</label>
                <input
                  className="w-full border border-black/10 bg-transparent text-sm text-black px-3 py-2 outline-none focus:border-black/30"
                  placeholder="e.g. BlackRock"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-widest text-black/30">Access Level</label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))}>
                  <SelectTrigger className="border border-black/10 bg-transparent text-sm text-black">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counterparty">Counterparty — View & Trade</SelectItem>
                    <SelectItem value="auditor">Auditor — Compliance Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <button
                className="border border-black text-black text-sm px-4 py-2 hover:bg-black/5 transition-colors"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-black text-white text-sm px-4 py-2 hover:bg-black/80 transition-colors disabled:opacity-40"
                onClick={handleInvite}
                disabled={inviteLoading || !inviteForm.vaultId || !inviteForm.publicKey || !inviteForm.role}
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </RoleGate>
      </div>

      {/* Visibility Model */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-4">Canton Visibility Model</p>
        <div className="grid gap-px sm:grid-cols-3 border border-black/[0.06]">
          <div className="p-4 bg-white">
            <p className="text-sm font-medium text-black">Owner</p>
            <p className="mt-1 text-xs text-black/45">Full access to all vault data and trade management</p>
          </div>
          <div className="p-4 bg-white border-t sm:border-t-0 sm:border-l border-black/[0.06]">
            <p className="text-sm font-medium text-black">Counterparty</p>
            <p className="mt-1 text-xs text-black/45">Views composition, can propose trades</p>
          </div>
          <div className="p-4 bg-white border-t sm:border-t-0 sm:border-l border-black/[0.06]">
            <p className="text-sm font-medium text-black">Auditor</p>
            <p className="mt-1 text-xs text-black/45">Compliance-only read access, no trade visibility</p>
          </div>
        </div>
      </div>

      {/* Confidential Vaults */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-4">Confidential Vaults</p>

        {confidentialVaults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-black/[0.06]">
            <p className="text-sm text-black/30">No confidential vaults. Canton Network may not be connected.</p>
          </div>
        ) : isAuditorOnly ? (
          /* Auditor Limited View — compliance summary only */
          <div className="border border-black/[0.06]">
            <div className="p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-black/30 mb-4">Compliance Summary</p>
              <p className="text-xs text-black/30 mb-6">Auditor view — aggregate data only</p>
              <div className="grid gap-px sm:grid-cols-3 border border-black/[0.06]">
                <div className="p-4 bg-white text-center">
                  <p className="text-xs text-black/30 uppercase tracking-widest">Total Vaults</p>
                  <p className="mt-1 text-2xl font-semibold text-black">{confidentialVaults.length}</p>
                </div>
                <div className="p-4 bg-white border-t sm:border-t-0 sm:border-l border-black/[0.06] text-center">
                  <p className="text-xs text-black/30 uppercase tracking-widest">Total Assets</p>
                  <p className="mt-1 text-2xl font-semibold text-black">
                    {confidentialVaults.reduce((s: number, v: any) => s + (v.assetCount || 0), 0)}
                  </p>
                </div>
                <div className="p-4 bg-white border-t sm:border-t-0 sm:border-l border-black/[0.06] text-center">
                  <p className="text-xs text-black/30 uppercase tracking-widest">Aggregate Value</p>
                  <p className="mt-1 text-2xl font-semibold text-black">
                    {formatCurrency(confidentialVaults.reduce((s: number, v: any) => s + (v.totalValue || 0), 0))}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-black/30">
                Counterparty names, trade details, and party information are not visible in auditor view.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {confidentialVaults.map((cv: any) => (
              <div key={cv.id}>
                {/* Vault header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-base font-medium text-black">{cv.name}</h2>
                    <p className="mt-0.5 text-xs text-black/45">
                      Owner: {cv.owner} &middot; {cv.assetCount} assets &middot; {formatCurrency(cv.totalValue)}
                    </p>
                  </div>
                  <span className="text-xs text-black/30 border border-black/[0.06] px-2 py-1">
                    {cv.parties.length} parties
                  </span>
                </div>

                {/* Authorized Parties */}
                <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-3">Authorized Parties</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      <th className="text-left pb-2 text-xs font-medium text-black/30 uppercase tracking-widest">Institution</th>
                      <th className="text-left pb-2 text-xs font-medium text-black/30 uppercase tracking-widest">Access Level</th>
                      <th className="text-left pb-2 text-xs font-medium text-black/30 uppercase tracking-widest">Visibility</th>
                      <th className="text-left pb-2 text-xs font-medium text-black/30 uppercase tracking-widest">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {cv.parties.map((party: any) => (
                      <tr key={party.id}>
                        <td className="py-3 pr-4">
                          <p className="text-black font-medium">{party.name}</p>
                          <p className="text-xs text-black/30 font-mono">{party.publicKey}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="capitalize text-black/45">{party.role}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-xs text-black/30">{getVisibilityDescription(party.role)}</p>
                        </td>
                        <td className="py-3 text-xs text-black/30">{party.joinedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Trade Proposals */}
                <div className="mt-8">
                  <p className="text-sm font-medium uppercase tracking-widest text-black/30 mb-3">Trade Proposals</p>
                  {cv.trades.length === 0 ? (
                    <p className="text-sm text-black/30">No trade proposals yet</p>
                  ) : (
                    <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                      {cv.trades.map((trade: any) => (
                        <div key={trade.id} className="py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-black">
                                <span className="font-medium">{trade.from}</span>
                                <span className="text-black/30 mx-2">→</span>
                                <span className="font-medium">{trade.to}</span>
                              </p>
                              <p className="mt-1 text-xs text-black/45">
                                {trade.amount} tokens of {trade.assetName} @ {formatCurrency(trade.price)}/token
                              </p>
                              <p className="text-xs text-black/30">
                                Total: {formatCurrency(trade.amount * trade.price)}
                              </p>
                            </div>
                            <span className="text-xs text-black/30 border border-black/[0.06] px-2 py-1 capitalize">
                              {trade.status}
                            </span>
                          </div>
                          {trade.message && (
                            <p className="mt-2 text-xs text-black/30 bg-black/[0.02] px-3 py-2">
                              {trade.message}
                            </p>
                          )}
                          {trade.status === 'pending' && (
                            <RoleGate allowed={['ADMIN', 'ISSUER']} silent>
                            <div className="mt-3 flex gap-2">
                              <button
                                className="bg-black text-white text-xs px-3 py-1.5 hover:bg-black/80 transition-colors disabled:opacity-40"
                                disabled={tradeLoading === trade.id}
                                onClick={() => handleTradeAccept(trade.id)}
                              >
                                {tradeLoading === trade.id ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                className="border border-black text-black text-xs px-3 py-1.5 hover:bg-black/5 transition-colors"
                                onClick={() => updateTradeStatus(cv.id, trade.id, 'countered')}
                              >
                                Counter
                              </button>
                              <button
                                className="text-black/45 text-xs px-3 py-1.5 hover:text-black transition-colors disabled:opacity-40"
                                disabled={tradeLoading === trade.id}
                                onClick={() => handleTradeReject(trade.id)}
                              >
                                {tradeLoading === trade.id ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                            </RoleGate>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
