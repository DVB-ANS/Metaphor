'use client';

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FolderLock,
  Users,
  UserPlus,
  Eye,
  EyeOff,
  Shield,
  Handshake,
  ArrowRightLeft,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import {
  formatCurrency,
  getTradeStatusVariant,
  type VisibilityLevel,
} from '@/lib/mock-data';
import { api } from '@/lib/api';

function getVisibilityIcon(role: VisibilityLevel) {
  switch (role) {
    case 'owner':
      return <Eye className="h-4 w-4 text-primary" />;
    case 'counterparty':
      return <Handshake className="h-4 w-4 text-blue-400" />;
    case 'auditor':
      return <Shield className="h-4 w-4 text-yellow-400" />;
  }
}

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ vaultId: '', publicKey: '', name: '', role: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [confidentialVaults, setConfidentialVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tradeLoading, setTradeLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/demo/canton/vaults')
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

  if (loading) return <BentoGrid className="space-y-6"><div className="flex h-64 items-center justify-center"><p className="text-sm text-neutral-500 animate-pulse">Loading data room...</p></div></BentoGrid>;
  if (fetchError) return <BentoGrid className="space-y-6"><div className="flex h-64 flex-col items-center justify-center gap-2"><p className="text-sm text-red-400">Failed to load data room</p><p className="text-xs text-neutral-600">{fetchError}</p></div></BentoGrid>;

  return (
    <BentoGrid className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Room</h1>
          <p className="text-muted-foreground">
            Confidential vaults on Canton Network — party-scoped visibility
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Invite Party
            </Button>
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
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{inviteError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vault</Label>
                <Select value={inviteForm.vaultId} onValueChange={(v) => setInviteForm((prev) => ({ ...prev, vaultId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vault" />
                  </SelectTrigger>
                  <SelectContent>
                    {confidentialVaults.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canton Public Key</Label>
                <Input
                  placeholder="0x..."
                  value={inviteForm.publicKey}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  placeholder="e.g. BlackRock"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))}>
                  <SelectTrigger>
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
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteLoading || !inviteForm.vaultId || !inviteForm.publicKey || !inviteForm.role}>
                {inviteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visibility Model Explainer */}
      <BentoCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="h-4 w-4" />
            Canton Visibility Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Eye className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Owner</p>
                <p className="text-xs text-muted-foreground">Full access to all vault data and trade management</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Handshake className="mt-0.5 h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium">Counterparty</p>
                <p className="text-xs text-muted-foreground">Views composition, can propose trades</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Shield className="mt-0.5 h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium">Auditor</p>
                <p className="text-xs text-muted-foreground">Compliance-only read access, no trade visibility</p>
              </div>
            </div>
          </div>
        </CardContent>
      </BentoCard>

      {/* Confidential Vaults */}
      {confidentialVaults.map((cv: any) => (
        <BentoCard key={cv.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderLock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{cv.name}</CardTitle>
                  <CardDescription>
                    Owner: {cv.owner} &middot; {cv.assetCount} assets &middot;{' '}
                    {formatCurrency(cv.totalValue)}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{cv.parties.length} parties</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Authorized Parties */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" /> Authorized Parties
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cv.parties.map((party: any) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{party.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {party.publicKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVisibilityIcon(party.role)}
                          <span className="capitalize">{party.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">
                          {getVisibilityDescription(party.role)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {party.joinedAt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Trade Proposals */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ArrowRightLeft className="h-4 w-4" /> Trade Proposals (PrivateTrade)
              </p>
              {cv.trades.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trade proposals yet</p>
              ) : (
                <div className="space-y-3">
                  {cv.trades.map((trade: any) => (
                    <div key={trade.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{trade.from}</span>
                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{trade.to}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {trade.amount} tokens of {trade.assetName} @{' '}
                            {formatCurrency(trade.price)}/token
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total: {formatCurrency(trade.amount * trade.price)}
                          </p>
                        </div>
                        <Badge variant={getTradeStatusVariant(trade.status)}>
                          {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                        </Badge>
                      </div>
                      {trade.message && (
                        <div className="mt-3 flex items-start gap-2 rounded bg-muted/50 p-2">
                          <MessageSquare className="mt-0.5 h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{trade.message}</p>
                        </div>
                      )}
                      {trade.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={tradeLoading === trade.id}
                            onClick={() => handleTradeAccept(trade.id)}
                          >
                            {tradeLoading === trade.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            Accept
                          </Button>
                          <Button size="sm" variant="outline">
                            Counter
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={tradeLoading === trade.id}
                            onClick={() => handleTradeReject(trade.id)}
                          >
                            {tradeLoading === trade.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </BentoCard>
      ))}
    </BentoGrid>
  );
}
