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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Key, Palette, UserPlus, Trash2, Upload, Loader2 } from 'lucide-react';
import { RoleGate } from '@/components/role-gate';
import { type Role } from '@/lib/mock-data';
import { api } from '@/lib/api';

export default function AdminPage() {
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({ address: '', label: '', role: '' });
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [whitelabelForm, setWhitelabelForm] = useState({
    institutionName: 'Metaphor',
    primaryColor: '#6366f1',
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

  const handleAddWallet = async () => {
    setWalletSubmitting(true);
    setWalletError(null);
    try {
      // Call both whitelist and role assignment
      await api.post('/api/adi/whitelist', { address: walletForm.address });
      if (walletForm.role) {
        await api.post('/api/adi/roles', { address: walletForm.address, role: walletForm.role });
      }
      // Optimistically add to local state
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
      setAddWalletOpen(false);
      setWalletForm({ address: '', label: '', role: '' });
    } catch (err: any) {
      setWalletError(err.message || 'Failed to add wallet. Check that the backend is running.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  const roles = [
    {
      name: 'Admin',
      count: wallets.filter((w: any) => w.role === 'admin').length,
      permissions: ['Issue', 'Invest', 'Audit', 'Administer'],
      variant: 'default' as const,
      description: 'Full access to all platform features',
    },
    {
      name: 'Issuer',
      count: wallets.filter((w: any) => w.role === 'issuer').length,
      permissions: ['Issue'],
      variant: 'secondary' as const,
      description: 'Can tokenize and manage own assets',
    },
    {
      name: 'Investor',
      count: wallets.filter((w: any) => w.role === 'investor').length,
      permissions: ['Invest'],
      variant: 'secondary' as const,
      description: 'Can invest in vaults and view holdings',
    },
    {
      name: 'Auditor',
      count: wallets.filter((w: any) => w.role === 'auditor').length,
      permissions: ['Audit (limited)'],
      variant: 'outline' as const,
      description: 'Read-only compliance access',
    },
  ];

  if (loading) return <BentoGrid className="space-y-6"><div className="flex h-64 items-center justify-center"><p className="text-sm text-neutral-500 animate-pulse">Loading admin data...</p></div></BentoGrid>;
  if (fetchError) return <BentoGrid className="space-y-6"><div className="flex h-64 flex-col items-center justify-center gap-2"><p className="text-sm text-red-400">Failed to load admin data</p><p className="text-xs text-neutral-600">{fetchError}</p></div></BentoGrid>;

  return (
    <RoleGate allowed={['ADMIN']}>
    <BentoGrid className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Role-based access control, wallet whitelist, and white-label config
        </p>
      </div>

      {/* RBAC Section */}
      <BentoCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions (RBAC)
          </CardTitle>
          <CardDescription>Managed by AccessControl.sol on ADI chain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div key={role.name} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{role.name}</p>
                  <Badge variant={role.variant}>{role.count}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </BentoCard>

      {/* Wallet Whitelist */}
      <BentoCard>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Wallet Whitelist
            </CardTitle>
            <CardDescription>
              KYC-validated wallets authorized to hold RWA tokens
            </CardDescription>
          </div>
          <Dialog open={addWalletOpen} onOpenChange={setAddWalletOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" /> Add Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Wallet to Whitelist</DialogTitle>
                <DialogDescription>
                  Add a KYC-verified wallet to the authorized whitelist on ADI AccessControl.
                </DialogDescription>
              </DialogHeader>
              {walletError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{walletError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <Input
                    placeholder="0x..."
                    value={walletForm.address}
                    onChange={(e) => setWalletForm((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    placeholder="e.g. BlackRock Fund III"
                    value={walletForm.label}
                    onChange={(e) => setWalletForm((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={walletForm.role} onValueChange={(v) => setWalletForm((prev) => ({ ...prev, role: v }))}>
                    <SelectTrigger>
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
                <Button variant="outline" onClick={() => setAddWalletOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddWallet} disabled={walletSubmitting || !walletForm.address}>
                  {walletSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    'Add to Whitelist'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No whitelisted wallets found on-chain.
                  </TableCell>
                </TableRow>
              ) : wallets.map((wallet: any) => (
                <TableRow key={wallet.address}>
                  <TableCell className="font-mono text-sm">{wallet.address}</TableCell>
                  <TableCell>{wallet.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {wallet.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={wallet.kycStatus === 'verified' ? 'default' : 'secondary'}
                    >
                      {wallet.kycStatus === 'verified' ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {wallet.addedAt}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Remove ${wallet.label} (${wallet.address}) from the whitelist?`)) {
                          setWallets((prev) => prev.filter((w: any) => w.address !== wallet.address));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </BentoCard>

      {/* White-Label Configuration */}
      <BentoCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            White-Label Configuration
          </CardTitle>
          <CardDescription>
            Customize the platform for your institution (ADI bounty: white-label ready)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <Input
                value={whitelabelForm.institutionName}
                onChange={(e) =>
                  setWhitelabelForm((prev) => ({ ...prev, institutionName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Custom Domain</Label>
              <Input
                placeholder="vault.yourcompany.com"
                value={whitelabelForm.domain}
                onChange={(e) =>
                  setWhitelabelForm((prev) => ({ ...prev, domain: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={whitelabelForm.primaryColor}
                  onChange={(e) =>
                    setWhitelabelForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  value={whitelabelForm.primaryColor}
                  onChange={(e) =>
                    setWhitelabelForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex h-10 items-center gap-3">
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" /> Upload Logo
                </Button>
                <span className="text-xs text-muted-foreground">PNG or SVG, max 2MB</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: whitelabelForm.primaryColor }}
              >
                {whitelabelForm.institutionName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-lg font-semibold">{whitelabelForm.institutionName}</span>
            </div>
          </div>

          <Button
            onClick={() =>
              alert('White-label config saved (mock). Multi-tenant registry coming in Phase 4.')
            }
          >
            Save Configuration
          </Button>
        </CardContent>
      </BentoCard>
    </BentoGrid>
    </RoleGate>
  );
}
