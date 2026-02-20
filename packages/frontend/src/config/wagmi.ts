'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

// ADI custom chain — will be configured once RPC details are available
export const adiChain: Chain = {
  id: 0xAD1, // placeholder chain ID
  name: 'ADI Chain',
  nativeCurrency: {
    name: 'ADI',
    symbol: 'ADI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ADI_RPC_URL || 'http://localhost:8545'],
    },
  },
};

export const config = getDefaultConfig({
  appName: 'InstiVault',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [adiChain, mainnet, sepolia],
  transports: {
    [adiChain.id]: http(process.env.NEXT_PUBLIC_ADI_RPC_URL || 'http://localhost:8545'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
