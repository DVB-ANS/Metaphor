'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Handshake,
  Shield,
  FolderLock,
  ArrowRightLeft,
  Users,
  FileText,
  EyeOff,
  Lock,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, type RoleName } from '@/contexts/auth-context';

interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
}

interface DemoAsset {
  id: string;
  name: string;
  type: string;
  allocation?: number;
  value?: number;
  rating: string;
  couponRate?: number;
  maturityDate: string;
  jurisdiction: string;
}

interface DemoParty {
  id: string;
  name: string;
  role: string;
  publicKey: string;
  joinedAt: string;
}

interface DemoTrade {
  id: string;
  from: string;
  to: string;
  assetName: string;
  amount: number;
  price: number;
  status: string;
  createdAt: string;
  message?: string;
}

interface DemoView {
  role: string;
  partyName: string;
  vault: {
    name: string;
    totalValue: number | null;
    assetCount: number;
    status: string;
  };
  assets: DemoAsset[] | null;
  parties: DemoParty[] | null;
  trades: DemoTrade[] | null;
  auditLog: AuditLogEntry[] | null;
}

const VAULT_ID = 'cv-1';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

type CantonRole = 'owner' | 'counterparty' | 'auditor';

function getRoleLabel(role: CantonRole): string {
  switch (role) {
    case 'owner': return 'Owner';
    case 'counterparty': return 'Counterparty';
    case 'auditor': return 'Auditor';
  }
}

function getRoleDescription(role: CantonRole): string {
  switch (role) {
    case 'owner': return 'Full access — vault, assets, trades, audit log';
    case 'counterparty': return 'Sees composition + own trades only';
    case 'auditor': return 'Compliance only — no values, no trades';
  }
}

/** Map frontend auth roles to Canton demo roles */
function getCantonRoles(authRoles: RoleName[], isAuthenticated: boolean): CantonRole[] {
  if (!isAuthenticated) return ['owner', 'counterparty', 'auditor'];

  const hasRole = (r: RoleName) => authRoles.includes(r);

  if (hasRole('ADMIN')) return ['owner', 'counterparty', 'auditor'];
  if (hasRole('ISSUER')) return ['owner'];
  if (hasRole('INVESTOR')) return ['counterparty'];
  if (hasRole('AUDITOR')) return ['auditor'];

  return ['owner', 'counterparty', 'auditor'];
}

function DemoPanel({ role }: { role: CantonRole }) {
  const [data, setData] = useState<DemoView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DemoView>(`/api/demo/canton/demo/${VAULT_ID}/${role}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [role]);

  const updateTradeStatus = (tradeId: string, newStatus: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            trades: prev.trades?.map((t) =>
              t.id === tradeId ? { ...t, status: newStatus } : t
            ) ?? null,
          }
        : null
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-black/[0.06] bg-white p-8">
        <p className="animate-pulse text-sm text-black/30">Loading {role} view...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center border border-black/[0.06] bg-white p-8 text-center">
        <EyeOff className="mb-2 h-6 w-6 text-black/20" />
        <p className="text-sm text-black/45">Could not load {role} view</p>
        <p className="mt-1 text-xs text-black/30">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-black/[0.06] bg-white overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          {role === 'owner' && <Eye className="h-4 w-4 text-black/40" />}
          {role === 'counterparty' && <Handshake className="h-4 w-4 text-black/40" />}
          {role === 'auditor' && <Shield className="h-4 w-4 text-black/40" />}
          <span className="text-sm font-semibold text-black">{data.partyName}</span>
        </div>
        <span className="text-xs font-medium uppercase tracking-widest text-black/30">{role}</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Vault Info */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <FolderLock className="h-3.5 w-3.5" /> Vault
          </div>
          <div className="mt-2 border border-black/[0.06] p-3">
            <p className="text-sm font-medium text-black">{data.vault.name}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-black/40">
              {data.vault.totalValue !== null ? (
                <span>{formatCurrency(data.vault.totalValue)}</span>
              ) : (
                <span className="flex items-center gap-1 text-black/20">
                  <Lock className="h-3 w-3" /> Value hidden
                </span>
              )}
              <span>{data.vault.assetCount} assets</span>
              <span className="text-xs text-black/30">{data.vault.status}</span>
            </div>
          </div>
        </div>

        {/* Assets */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <FileText className="h-3.5 w-3.5" /> Assets
          </div>
          {data.assets ? (
            <div className="mt-2 divide-y divide-black/[0.06] border border-black/[0.06]">
              {data.assets.map((asset) => (
                <div key={asset.id} className="p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-black">{asset.name}</span>
                    <span className="text-xs text-black/30">{asset.rating}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-black/40">
                    <span className="capitalize">{asset.type.replace('-', ' ')}</span>
                    <span>{asset.jurisdiction}</span>
                    {asset.value != null && <span>{formatCurrency(asset.value)}</span>}
                    {asset.allocation != null && <span>{asset.allocation}%</span>}
                    {asset.couponRate != null && <span>{asset.couponRate}% coupon</span>}
                    {!asset.value && !asset.allocation && !asset.couponRate && (
                      <span className="flex items-center gap-1 text-black/20">
                        <Lock className="h-2.5 w-2.5" /> Financial data restricted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 border border-black/[0.06] p-3 text-xs text-black/25">
              <Lock className="h-3.5 w-3.5" /> Asset details restricted for this role
            </div>
          )}
        </div>

        {/* Parties */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <Users className="h-3.5 w-3.5" /> Visible Parties
          </div>
          {data.parties && data.parties.length > 0 ? (
            <div className="mt-2 divide-y divide-black/[0.06] border border-black/[0.06]">
              {data.parties.map((party) => (
                <div key={party.id} className="flex items-center justify-between p-2.5">
                  <span className="text-xs text-black">{party.name}</span>
                  <span className="text-xs text-black/30 uppercase">{party.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 border border-black/[0.06] p-3 text-xs text-black/25">
              <Lock className="h-3.5 w-3.5" /> Party list restricted
            </div>
          )}
        </div>

        {/* Trades */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Trade Proposals
          </div>
          {data.trades ? (
            data.trades.length > 0 ? (
              <div className="mt-2 divide-y divide-black/[0.06] border border-black/[0.06]">
                {data.trades.map((trade) => (
                  <div key={trade.id} className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-black">
                        <span>{trade.from}</span>
                        <ArrowRightLeft className="h-3 w-3 text-black/25" />
                        <span>{trade.to}</span>
                      </div>
                      <span className="text-[10px] text-black/30 uppercase">{trade.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-black/40">
                      {trade.amount} tokens of {trade.assetName} @ {formatCurrency(trade.price)}/unit
                    </p>
                    {trade.message && (
                      <p className="mt-1 text-[11px] italic text-black/30">&ldquo;{trade.message}&rdquo;</p>
                    )}
                    {trade.status === 'pending' && role === 'owner' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          className="text-[10px] font-medium text-white bg-black px-2 py-1 hover:bg-black/80 transition-colors"
                          onClick={() => updateTradeStatus(trade.id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          className="text-[10px] font-medium text-black border border-black/15 px-2 py-1 hover:bg-black/[0.03] transition-colors"
                          onClick={() => updateTradeStatus(trade.id, 'countered')}
                        >
                          Counter
                        </button>
                        <button
                          className="text-[10px] font-medium text-black/40 px-2 py-1 hover:text-black transition-colors"
                          onClick={() => { if (confirm('Reject this trade?')) updateTradeStatus(trade.id, 'rejected'); }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-black/25">No trades visible</p>
            )
          ) : (
            <div className="mt-2 flex items-center gap-2 border border-black/[0.06] p-3 text-xs text-black/25">
              <Lock className="h-3.5 w-3.5" /> Trade data not visible for this role
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/30">
            <Clock className="h-3.5 w-3.5" /> Audit Log
          </div>
          {data.auditLog ? (
            <div className="mt-2 divide-y divide-black/[0.06] border border-black/[0.06]">
              {data.auditLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 p-2">
                  <span className="shrink-0 text-[10px] text-black/25">{entry.timestamp}</span>
                  <div>
                    <p className="text-[11px] text-black">{entry.action}</p>
                    <p className="text-[10px] text-black/35">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 border border-black/[0.06] p-3 text-xs text-black/25">
              <Lock className="h-3.5 w-3.5" /> Audit log not available for this role
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CantonDemoPage() {
  const { isAuthenticated, roles } = useAuth();
  const cantonRoles = getCantonRoles(roles, isAuthenticated);
  const isSingleView = cantonRoles.length === 1;

  return (
    <div className="mx-auto max-w-6xl space-y-12 pt-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-black">
          Canton Visibility Demo
        </h1>
        <p className="mt-1 text-sm text-black/35">
          {isSingleView
            ? `Viewing as ${getRoleLabel(cantonRoles[0])} — ${getRoleDescription(cantonRoles[0])}`
            : 'Three views of the same confidential vault — each party sees only what they are authorized to see'}
        </p>
      </div>

      {/* Legend — only show when multiple panels are visible */}
      {!isSingleView && (
        <div className="flex flex-wrap items-center gap-8">
          {cantonRoles.map((role) => (
            <div key={role} className="flex items-center gap-2">
              {role === 'owner' && <Eye className="h-4 w-4 text-black/30" />}
              {role === 'counterparty' && <Handshake className="h-4 w-4 text-black/30" />}
              {role === 'auditor' && <Shield className="h-4 w-4 text-black/30" />}
              <div>
                <p className="text-sm font-medium text-black">{getRoleLabel(role)}</p>
                <p className="text-xs text-black/35">{getRoleDescription(role)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panels */}
      <div className={`grid min-h-[600px] gap-4 ${
        cantonRoles.length === 1
          ? 'max-w-2xl'
          : cantonRoles.length === 2
            ? 'lg:grid-cols-2'
            : 'lg:grid-cols-3'
      }`}>
        {cantonRoles.map((role) => (
          <DemoPanel key={role} role={role} />
        ))}
      </div>

      {/* Explanation */}
      <div className="border border-black/[0.06] bg-white p-8">
        <h2 className="text-base font-semibold text-black">How Canton Network Enables This</h2>
        <p className="mt-1 text-xs text-black/35">Native Daml smart contracts on Canton Devnet L1</p>
        <div className="mt-4 space-y-3 text-sm text-black/45">
          <p>
            Each vault is a <strong className="text-black">ConfidentialVault</strong> Daml template.
            Party visibility is enforced at the ledger level — not by application logic.
          </p>
          <p>
            Trades between parties use <strong className="text-black">PrivateTrade</strong> templates,
            visible only to the two parties involved. The auditor has an <strong className="text-black">AuditRight</strong>{' '}
            that grants read-only compliance access without exposing trading activity.
          </p>
          <p>
            This means even the platform operator cannot see vault contents they are not authorized to view.
            Privacy is guaranteed by the Canton protocol, not by access control lists.
          </p>
        </div>
      </div>
    </div>
  );
}
