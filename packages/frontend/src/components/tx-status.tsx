'use client';

import { type TxStatus } from '@/hooks/use-adi-write';

interface TxStatusBannerProps {
  status: TxStatus;
  txHash?: `0x${string}`;
  error?: Error | null;
  successMessage?: string;
}

export function TxStatusBanner({ status, txHash, error, successMessage }: TxStatusBannerProps) {
  if (status === 'idle') return null;

  const truncatedHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '';

  return (
    <div
      className={`border px-4 py-3 text-sm ${
        status === 'success'
          ? 'border-black/20 text-black/60'
          : status === 'error'
            ? 'border-black/10 bg-black/[0.02] text-black/60'
            : 'border-black/10 text-black/45'
      }`}
    >
      {status === 'pending' && <p>Confirm in your wallet...</p>}
      {status === 'confirming' && (
        <p>
          Confirming...{' '}
          {truncatedHash && <span className="font-mono text-xs text-black/30">{truncatedHash}</span>}
        </p>
      )}
      {status === 'success' && <p>{successMessage ?? 'Transaction confirmed.'}</p>}
      {status === 'error' && (
        <p>{error?.message ? extractRevertReason(error.message) : 'Transaction failed.'}</p>
      )}
    </div>
  );
}

function extractRevertReason(msg: string): string {
  const match = msg.match(/reason:\s*(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();
  if (msg.includes('User rejected')) return 'Transaction rejected by user.';
  if (msg.length > 200) return msg.slice(0, 200) + '...';
  return msg;
}
