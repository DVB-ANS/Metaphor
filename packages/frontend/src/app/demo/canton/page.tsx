'use client';

import { useState, useEffect } from 'react';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { BentoGrid, BentoCard } from '@/components/ui/magic-bento';
import { api } from '@/lib/api';

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

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'owner': return <Eye className="h-4 w-4 text-neutral-200" />;
    case 'counterparty': return <Handshake className="h-4 w-4 text-blue-400" />;
    case 'auditor': return <Shield className="h-4 w-4 text-yellow-400" />;
    default: return null;
  }
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: 'bg-neutral-700 text-neutral-200',
    counterparty: 'bg-blue-950 text-blue-300 border-blue-800',
    auditor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${colors[role] || 'bg-neutral-800'}`}>
      <RoleIcon role={role} />
      <span className="capitalize">{role}</span>
    </div>
  );
}

function DemoPanel({ role, color }: { role: 'owner' | 'counterparty' | 'auditor'; color: string }) {
  const [data, setData] = useState<DemoView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DemoView>(`/api/demo/canton/demo/${VAULT_ID}/${role}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <div className="animate-pulse text-sm text-neutral-500">Loading {role} view...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <EyeOff className="mb-2 h-8 w-8 text-neutral-600" />
        <p className="text-sm text-neutral-400">Could not load {role} view</p>
        <p className="mt-1 text-xs text-neutral-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-xl border bg-neutral-900 ${color} overflow-hidden`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <RoleIcon role={role} />
          <span className="text-sm font-semibold text-neutral-200">{data.partyName}</span>
        </div>
        <RoleBadge role={role} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Vault Info */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <FolderLock className="h-3.5 w-3.5" /> Vault
          </div>
          <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
            <p className="text-sm font-medium text-neutral-200">{data.vault.name}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
              {data.vault.totalValue !== null ? (
                <span>{formatCurrency(data.vault.totalValue)}</span>
              ) : (
                <span className="flex items-center gap-1 text-neutral-600">
                  <Lock className="h-3 w-3" /> Value hidden
                </span>
              )}
              <span>{data.vault.assetCount} assets</span>
              <Badge variant="outline" className="text-[10px]">{data.vault.status}</Badge>
            </div>
          </div>
        </div>

        {/* Assets */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <FileText className="h-3.5 w-3.5" /> Assets
          </div>
          {data.assets ? (
            <div className="mt-2 space-y-1.5">
              {data.assets.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-200">{asset.name}</span>
                    <Badge variant="outline" className="text-[10px]">{asset.rating}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="capitalize">{asset.type.replace('-', ' ')}</span>
                    <span>{asset.jurisdiction}</span>
                    {asset.value != null && <span>{formatCurrency(asset.value)}</span>}
                    {asset.allocation != null && <span>{asset.allocation}%</span>}
                    {asset.couponRate != null && <span>{asset.couponRate}% coupon</span>}
                    {!asset.value && !asset.allocation && !asset.couponRate && (
                      <span className="flex items-center gap-1 text-neutral-600">
                        <Lock className="h-2.5 w-2.5" /> Financial data restricted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-600">
              <Lock className="h-3.5 w-3.5" /> Asset details restricted for this role
            </div>
          )}
        </div>

        {/* Parties */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <Users className="h-3.5 w-3.5" /> Visible Parties
          </div>
          {data.parties && data.parties.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {data.parties.map((party) => (
                <div key={party.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 p-2.5">
                  <span className="text-xs text-neutral-300">{party.name}</span>
                  <RoleBadge role={party.role} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-600">
              <Lock className="h-3.5 w-3.5" /> Party list restricted
            </div>
          )}
        </div>

        {/* Trades */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Trade Proposals
          </div>
          {data.trades ? (
            data.trades.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {data.trades.map((trade) => (
                  <div key={trade.id} className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-neutral-300">
                        <span>{trade.from}</span>
                        <ArrowRightLeft className="h-3 w-3 text-neutral-600" />
                        <span>{trade.to}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{trade.status}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {trade.amount} tokens of {trade.assetName} @ {formatCurrency(trade.price)}/unit
                    </p>
                    {trade.message && (
                      <p className="mt-1 text-[11px] italic text-neutral-600">&ldquo;{trade.message}&rdquo;</p>
                    )}
                    {trade.status === 'pending' && role === 'owner' && (
                      <div className="mt-2 flex gap-1.5">
                        <Button size="sm" variant="default" className="h-6 text-[10px]">Accept</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]">Counter</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]">Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-neutral-600">No trades visible</p>
            )
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-600">
              <Lock className="h-3.5 w-3.5" /> Trade data not visible for this role
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <Clock className="h-3.5 w-3.5" /> Audit Log
          </div>
          {data.auditLog ? (
            <div className="mt-2 space-y-1">
              {data.auditLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-2">
                  <span className="shrink-0 text-[10px] text-neutral-600">{entry.timestamp}</span>
                  <div>
                    <p className="text-[11px] text-neutral-300">{entry.action}</p>
                    <p className="text-[10px] text-neutral-500">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-600">
              <Lock className="h-3.5 w-3.5" /> Audit log not available for this role
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CantonDemoPage() {
  return (
    <BentoGrid className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Canton Visibility Demo</h1>
        <p className="text-muted-foreground">
          Three views of the same confidential vault — each party sees only what they are authorized to see
        </p>
      </div>

      {/* Legend */}
      <BentoCard>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-neutral-200" />
            <div>
              <p className="text-sm font-medium">Owner</p>
              <p className="text-xs text-muted-foreground">Full access — vault, assets, trades, audit log</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-sm font-medium">Counterparty</p>
              <p className="text-xs text-muted-foreground">Sees composition + own trades only</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-400" />
            <div>
              <p className="text-sm font-medium">Auditor</p>
              <p className="text-xs text-muted-foreground">Compliance only — no values, no trades</p>
            </div>
          </div>
        </CardContent>
      </BentoCard>

      {/* 3 Panels Side by Side */}
      <div className="grid min-h-[600px] gap-4 lg:grid-cols-3">
        <DemoPanel role="owner" color="border-neutral-700" />
        <DemoPanel role="counterparty" color="border-blue-900/50" />
        <DemoPanel role="auditor" color="border-yellow-900/50" />
      </div>

      {/* Explanation */}
      <BentoCard>
        <CardHeader>
          <CardTitle className="text-base">How Canton Network Enables This</CardTitle>
          <CardDescription>Native Daml smart contracts on Canton Devnet L1</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-400">
          <p>
            Each vault is a <strong className="text-neutral-200">ConfidentialVault</strong> Daml template.
            Party visibility is enforced at the ledger level — not by application logic.
          </p>
          <p>
            Trades between parties use <strong className="text-neutral-200">PrivateTrade</strong> templates,
            visible only to the two parties involved. The auditor has an <strong className="text-neutral-200">AuditRight</strong>{' '}
            that grants read-only compliance access without exposing trading activity.
          </p>
          <p>
            This means even the platform operator cannot see vault contents they are not authorized to view.
            Privacy is guaranteed by the Canton protocol, not by access control lists.
          </p>
        </CardContent>
      </BentoCard>
    </BentoGrid>
  );
}
