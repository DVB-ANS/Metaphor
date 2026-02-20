import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderLock } from 'lucide-react';

export default function DataRoomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Room</h1>
        <p className="text-muted-foreground">
          Manage confidential vaults on Canton Network
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderLock className="h-5 w-5" />
            Confidential Vaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderLock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Canton Network integration pending
            </p>
            <p className="text-sm text-muted-foreground/70">
              Vault invitations, access levels, and private negotiations will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
