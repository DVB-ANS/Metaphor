'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import {
  CONTRACTS,
  ADI_CHAIN_ID,
  TOKEN_FACTORY_ABI,
  VAULT_MANAGER_ABI,
  ACCESS_CONTROL_ABI,
  ERC20_APPROVE_ABI,
  ROLES,
  ROLE_LABEL,
} from '@/config/contracts';

// ---------------------------------------------------------------------------
// Shared tx status helper
// ---------------------------------------------------------------------------

export type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export function useTxStatus(write: ReturnType<typeof useWriteContract>, receipt: ReturnType<typeof useWaitForTransactionReceipt>) {
  // wagmi v2 / TanStack Query v5: isLoading = isPending && isFetching
  // isFetching is true when actually polling for receipt (hash exists)
  const isWaitingForReceipt = receipt.isFetching && !receipt.isSuccess && !receipt.isError;

  const status: TxStatus =
    receipt.isSuccess ? 'success' :
    receipt.isError ? 'error' :
    isWaitingForReceipt ? 'confirming' :
    write.isPending ? 'pending' :
    write.isError ? 'error' :
    'idle';

  const error = write.error || receipt.error;
  const txHash = write.data;

  return { status, error, txHash };
}

// ---------------------------------------------------------------------------
// useCreateToken — calls TokenFactory.createToken()
// ---------------------------------------------------------------------------

export interface CreateTokenParams {
  name: string;
  symbol: string;
  isin: string;
  rate: number;
  maturity: number;       // unix timestamp
  initialSupply: string;  // raw amount (will be parsed to 18 decimals)
}

export function useCreateToken() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: ADI_CHAIN_ID });
  const tx = useTxStatus(write, receipt);

  const createToken = (params: CreateTokenParams) => {
    write.writeContract({
      address: CONTRACTS.tokenFactory,
      abi: TOKEN_FACTORY_ABI,
      functionName: 'createToken',
      args: [{
        name: params.name,
        symbol: params.symbol,
        isin: params.isin,
        rate: BigInt(params.rate),
        maturity: BigInt(params.maturity),
        initialSupply: parseUnits(params.initialSupply, 18),
      }],
      chainId: ADI_CHAIN_ID,
    });
  };

  return { createToken, ...tx, reset: write.reset };
}

// ---------------------------------------------------------------------------
// useCreateVault — calls VaultManager.createVault()
// ---------------------------------------------------------------------------

export function useCreateVault() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: ADI_CHAIN_ID });
  const tx = useTxStatus(write, receipt);

  const createVault = () => {
    write.writeContract({
      address: CONTRACTS.vaultManager,
      abi: VAULT_MANAGER_ABI,
      functionName: 'createVault',
      args: [],
      chainId: ADI_CHAIN_ID,
    });
  };

  // Parse VaultCreated event to get on-chain vault ID
  let onChainVaultId: number | undefined;
  if (receipt.data?.logs) {
    for (const log of receipt.data.logs) {
      // VaultCreated(uint256 indexed vaultId, address indexed owner)
      // topic[0] = event sig, topic[1] = vaultId
      if (log.topics.length >= 2 && log.topics[1] && log.address.toLowerCase() === CONTRACTS.vaultManager.toLowerCase()) {
        onChainVaultId = Number(BigInt(log.topics[1]));
        break;
      }
    }
  }

  return { createVault, ...tx, onChainVaultId, reset: write.reset };
}

// ---------------------------------------------------------------------------
// useDeposit — approve() then deposit()
// ---------------------------------------------------------------------------

export interface DepositParams {
  vaultId: bigint;
  token: `0x${string}`;
  amount: string; // human-readable, parsed to 18 decimals
}

export function useDeposit() {
  const approve = useWriteContract();
  const deposit = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data, chainId: ADI_CHAIN_ID });
  const depositReceipt = useWaitForTransactionReceipt({ hash: deposit.data, chainId: ADI_CHAIN_ID });

  const approveStatus = useTxStatus(approve, approveReceipt);
  const depositStatus = useTxStatus(deposit, depositReceipt);

  const execute = (params: DepositParams) => {
    const amount = parseUnits(params.amount, 18);

    approve.writeContract(
      {
        address: params.token,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [CONTRACTS.vaultManager, amount],
        chainId: ADI_CHAIN_ID,
      },
      {
        onSuccess: () => {
          deposit.writeContract({
            address: CONTRACTS.vaultManager,
            abi: VAULT_MANAGER_ABI,
            functionName: 'deposit',
            args: [params.vaultId, params.token, amount],
            chainId: ADI_CHAIN_ID,
          });
        },
      },
    );
  };

  const status: TxStatus =
    depositStatus.status !== 'idle' ? depositStatus.status : approveStatus.status;
  const error = depositStatus.error || approveStatus.error;
  const txHash = deposit.data || approve.data;

  return { deposit: execute, status, error, txHash, reset: () => { approve.reset(); deposit.reset(); } };
}

// ---------------------------------------------------------------------------
// useWithdraw — calls VaultManager.withdraw()
// ---------------------------------------------------------------------------

export interface WithdrawParams {
  vaultId: bigint;
  token: `0x${string}`;
  amount: string;
}

export function useWithdraw() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: ADI_CHAIN_ID });
  const tx = useTxStatus(write, receipt);

  const withdraw = (params: WithdrawParams) => {
    write.writeContract({
      address: CONTRACTS.vaultManager,
      abi: VAULT_MANAGER_ABI,
      functionName: 'withdraw',
      args: [params.vaultId, params.token, parseUnits(params.amount, 18)],
      chainId: ADI_CHAIN_ID,
    });
  };

  return { withdraw, ...tx, reset: write.reset };
}

// ---------------------------------------------------------------------------
// useAddToWhitelist — calls AccessControl.addToWhitelist()
// ---------------------------------------------------------------------------

export function useAddToWhitelist() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: ADI_CHAIN_ID });
  const tx = useTxStatus(write, receipt);

  const addToWhitelist = (address: `0x${string}`) => {
    write.writeContract({
      address: CONTRACTS.accessControl,
      abi: ACCESS_CONTROL_ABI,
      functionName: 'addToWhitelist',
      args: [address],
      chainId: ADI_CHAIN_ID,
    });
  };

  return { addToWhitelist, ...tx, reset: write.reset };
}

// ---------------------------------------------------------------------------
// useGrantRole — calls AccessControl.grantRole()
// ---------------------------------------------------------------------------

export function useGrantRole() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: ADI_CHAIN_ID });
  const tx = useTxStatus(write, receipt);

  const grantRole = (role: string, account: `0x${string}`) => {
    const roleKey = ROLE_LABEL[role.toLowerCase()];
    const roleHash = roleKey ? ROLES[roleKey] : (role as `0x${string}`);

    write.writeContract({
      address: CONTRACTS.accessControl,
      abi: ACCESS_CONTROL_ABI,
      functionName: 'grantRole',
      args: [roleHash, account],
      chainId: ADI_CHAIN_ID,
    });
  };

  return { grantRole, ...tx, reset: write.reset };
}
