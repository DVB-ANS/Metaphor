'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

// ADI Chain Testnet (chain ID 99999)
export const adiChain: Chain = {
  id: 99999,
  name: 'ADI Chain Testnet',
  nativeCurrency: {
    name: 'ADI',
    symbol: 'ADI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ADI_RPC_URL || 'https://rpc.ab.testnet.adifoundation.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ADI Explorer',
      url: 'https://explorer.testnet.adifoundation.ai',
    },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'Metaphor',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [adiChain, mainnet, sepolia],
  transports: {
    [adiChain.id]: http(process.env.NEXT_PUBLIC_ADI_RPC_URL || 'http://localhost:8545'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
