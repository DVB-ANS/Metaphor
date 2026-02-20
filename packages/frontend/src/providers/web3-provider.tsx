'use client';

import { useEffect, useState } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/config/wagmi';
import { AuthProvider } from '@/contexts/auth-context';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {mounted ? (
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#6366f1',
                borderRadius: 'medium',
              })}
            >
              {children}
            </RainbowKitProvider>
          ) : (
            children
          )}
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
