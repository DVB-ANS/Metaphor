/**
 * Generate a new wallet for 0G Chain testnet.
 *
 * Usage: npx tsx scripts/generate-wallet.ts
 *
 * After running:
 * 1. Copy the private key to your .env file (ZG_PRIVATE_KEY=...)
 * 2. Get testnet OG tokens from the faucet:
 *    https://faucet.0g.ai (or check https://docs.0g.ai for current faucet URL)
 *    Send tokens to the address printed below.
 * 3. Run the integration test: npx tsx scripts/test-integration.ts
 */
import { ethers } from 'ethers';

const wallet = ethers.Wallet.createRandom();

console.log('=== 0G Testnet Wallet Generated ===\n');
console.log(`Address:     ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
console.log(`\n--- Next steps ---`);
console.log(`1. Add to .env:  ZG_PRIVATE_KEY=${wallet.privateKey}`);
console.log(`2. Get testnet OG tokens from: https://faucet.0g.ai`);
console.log(`   Send to: ${wallet.address}`);
console.log(`3. Run: npx tsx scripts/test-integration.ts`);
