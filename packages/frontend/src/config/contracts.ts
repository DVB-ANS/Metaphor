import { type Abi } from 'viem';

// ---------------------------------------------------------------------------
// Contract addresses — loaded from env vars, fallback to ADI chain deployment
// ---------------------------------------------------------------------------

export const ADI_CHAIN_ID = 99999;

export const CONTRACTS = {
  accessControl: (process.env.NEXT_PUBLIC_ADI_ACCESS_CONTROL_ADDRESS ??
    '0x370b687C889cC1a0b567E6A1Cc5fF002f6bf4108') as `0x${string}`,
  tokenFactory: (process.env.NEXT_PUBLIC_ADI_TOKEN_FACTORY_ADDRESS ??
    '0x18700C7D0907170E86fe5712D8988Ea9699b262A') as `0x${string}`,
  vaultManager: (process.env.NEXT_PUBLIC_ADI_VAULT_MANAGER_ADDRESS ??
    '0xC0F36E5313669A46dF488D4F5eE8b4227b4BBD26') as `0x${string}`,
} as const;

// ---------------------------------------------------------------------------
// Role hashes (keccak256)
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775' as `0x${string}`,
  ISSUER: '0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122' as `0x${string}`,
  INVESTOR: '0xb165298935924f540e4181c03493a5d686c54a0aaeb3f6216de85b7ffbba7738' as `0x${string}`,
  AUDITOR: '0x59a1c48e5837ad7a7f3dcedcbe129bf3249ec4fbf651fd4f5e2600ead39fe2f5' as `0x${string}`,
} as const;

export const ROLE_LABEL: Record<string, keyof typeof ROLES> = {
  admin: 'ADMIN',
  issuer: 'ISSUER',
  investor: 'INVESTOR',
  auditor: 'AUDITOR',
};

// ---------------------------------------------------------------------------
// ABIs — only the functions/events we actually call from the frontend
// ---------------------------------------------------------------------------

export const TOKEN_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createToken',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct RWATokenFactory.TokenParams',
        components: [
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'symbol', type: 'string', internalType: 'string' },
          { name: 'isin', type: 'string', internalType: 'string' },
          { name: 'rate', type: 'uint256', internalType: 'uint256' },
          { name: 'maturity', type: 'uint256', internalType: 'uint256' },
          { name: 'initialSupply', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'isin', type: 'string', indexed: false, internalType: 'string' },
      { name: 'issuer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      { name: 'symbol', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
] as const satisfies Abi;

export const VAULT_MANAGER_ABI = [
  {
    type: 'function',
    name: 'createVault',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'vaultId', type: 'uint256', internalType: 'uint256' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'vaultId', type: 'uint256', internalType: 'uint256' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'VaultCreated',
    inputs: [
      { name: 'vaultId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
] as const satisfies Abi;

export const ACCESS_CONTROL_ABI = [
  {
    type: 'function',
    name: 'addToWhitelist',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'grantRole',
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'whitelistAndGrantRole',
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeFromWhitelist',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

export const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
