import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Key, Palette } from 'lucide-react';

const roles = [
  {
    name: 'Admin',
    count: 1,
    permissions: ['Issue', 'Invest', 'Audit', 'Administer'],
    variant: 'default' as const,
  },
  {
    name: 'Issuer',
    count: 2,
    permissions: ['Issue'],
    variant: 'secondary' as const,
  },
  {
    name: 'Investor',
    count: 5,
    permissions: ['Invest'],
    variant: 'secondary' as const,
  },
  {
    name: 'Auditor',
    count: 1,
    permissions: ['Audit (limited)'],
    variant: 'outline' as const,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Role-based access control, wallet whitelist, and white-label config
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* RBAC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles & Permissions (RBAC)
            </CardTitle>
            <CardDescription>
              Managed by AccessControl.sol on ADI chain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{role.name}</p>
                    <Badge variant={role.variant}>{role.count} user(s)</Badge>
                  </div>
                  <div className="mt-1 flex gap-1">
                    {role.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Wallet Whitelist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Wallet Whitelist
            </CardTitle>
            <CardDescription>
              KYC-validated wallets authorized to hold RWA tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Whitelist management will be connected to ADI AccessControl
              </p>
            </div>
          </CardContent>
        </Card>

        {/* White-Label */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              White-Label Configuration
            </CardTitle>
            <CardDescription>
              Customize the platform for your institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Palette className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Logo, colors, and domain configuration coming in Phase 4
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
