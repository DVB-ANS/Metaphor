import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── ADI Provider + Signer ──────────────────────────────────────────

export function getAdiProvider(): ethers.JsonRpcProvider {
    const rpcUrl = process.env.ADI_RPC_URL || 'http://localhost:8545';
    return new ethers.JsonRpcProvider(rpcUrl);
}

export function getAdiSigner(): ethers.Wallet {
    const provider = getAdiProvider();
    const privateKey = process.env.ADI_PRIVATE_KEY;
    if (!privateKey) throw new Error('Missing ADI_PRIVATE_KEY in .env');
    return new ethers.Wallet(privateKey, provider);
}

// ─── Hedera Provider + Signer ───────────────────────────────────────

export function getHederaProvider(): ethers.JsonRpcProvider {
    const rpcUrl = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api';
    return new ethers.JsonRpcProvider(rpcUrl);
}

export function getHederaSigner(): ethers.Wallet {
    const provider = getHederaProvider();
    // Use Hedera operator key (ECDSA raw) — different from ADI signer
    const privateKey = process.env.HEDERA_PRIVATE_KEY || '0x05a0252ccdfea79d6ba3b8a222e365108414f50b6edebc9a6d68dadc0f4d4cf2';
    return new ethers.Wallet(privateKey, provider);
}

// ─── Load ABIs ──────────────────────────────────────────────────────

function loadAbi(packageDir: string, contractName: string): any[] {
    const abiPath = resolve(__dirname, `../../${packageDir}/abi/${contractName}.json`);
    return JSON.parse(readFileSync(abiPath, 'utf-8'));
}

export const ABIS = {
    AccessControl: loadAbi('contracts-adi', 'InstiVaultAccessControl'),
    TokenFactory: loadAbi('contracts-adi', 'RWATokenFactory'),
    RWAToken: loadAbi('contracts-adi', 'RWAToken'),
    VaultManager: loadAbi('contracts-adi', 'VaultManager'),
    InstitutionRegistry: loadAbi('contracts-adi', 'InstitutionRegistry'),
    CouponScheduler: loadAbi('contracts-hedera', 'CouponScheduler'),
    YieldDistributor: loadAbi('contracts-hedera', 'YieldDistributor'),
};

// ─── Contract Addresses ─────────────────────────────────────────────

export const ADDRESSES = {
    accessControl: process.env.ADI_ACCESS_CONTROL_ADDRESS || '',
    tokenFactory: process.env.ADI_TOKEN_FACTORY_ADDRESS || '',
    vaultManager: process.env.ADI_VAULT_MANAGER_ADDRESS || '',
    institutionRegistry: process.env.ADI_INSTITUTION_REGISTRY_ADDRESS || '',
    couponScheduler: process.env.HEDERA_COUPON_SCHEDULER_ADDRESS || '',
    yieldDistributor: process.env.HEDERA_YIELD_DISTRIBUTOR_ADDRESS || '',
};

// ─── Hedera contract names ──────────────────────────────────────────

const HEDERA_CONTRACTS = new Set(['CouponScheduler', 'YieldDistributor']);

// ─── Contract Instances ─────────────────────────────────────────────

export function getContract(name: keyof typeof ABIS, address: string, signerOrProvider?: ethers.Signer | ethers.Provider) {
    const sp = signerOrProvider || (HEDERA_CONTRACTS.has(name) ? getHederaProvider() : getAdiProvider());
    return new ethers.Contract(address, ABIS[name], sp);
}
