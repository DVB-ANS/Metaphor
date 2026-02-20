import {
    ContractExecuteTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    ContractId,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenId,
    AccountAllowanceApproveTransaction,
    Hbar,
} from '@hashgraph/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getHederaClient } from './config';

async function main() {
    const client = getHederaClient();
    const operatorId = client.operatorAccountId!;

    // Load deployed addresses
    const deploymentsPath = resolve(__dirname, '../deployments.json');
    let deployments: any;
    try {
        deployments = JSON.parse(readFileSync(deploymentsPath, 'utf-8'));
    } catch {
        throw new Error('deployments.json not found. Run `pnpm deploy` first.');
    }

    const schedulerContractId = ContractId.fromString(deployments.contracts.couponScheduler.contractId);
    const distributorContractId = ContractId.fromString(deployments.contracts.yieldDistributor.contractId);

    console.log('=== InstiVault Hedera E2E Test ===');
    console.log(`Operator: ${operatorId.toString()}`);
    console.log(`CouponScheduler: ${schedulerContractId.toString()}`);
    console.log(`YieldDistributor: ${distributorContractId.toString()}`);

    // Step 1: Authorize CouponScheduler with Schedule Service
    console.log('\n--- Step 1: Authorize CouponScheduler ---');
    const authTx = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(500_000)
        .setFunction('authorize');

    const authResponse = await authTx.execute(client);
    const authReceipt = await authResponse.getReceipt(client);
    console.log(`Authorization status: ${authReceipt.status.toString()}`);

    // Step 2: Register a bond
    console.log('\n--- Step 2: Register Bond ---');
    const now = Math.floor(Date.now() / 1000);
    const startDate = now + 60; // starts in 1 minute
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year
    const faceValue = 1_000_000; // 1M (6 decimals)
    const rate = 500; // 5% annual
    const frequency = 1; // Quarterly

    // Use placeholder addresses for bond/payment tokens (EVM addresses)
    const bondTokenAddr = operatorId.toSolidityAddress();
    const paymentTokenAddr = operatorId.toSolidityAddress();

    const registerTx = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(1_000_000)
        .setFunction(
            'registerBond',
            new ContractFunctionParameters()
                .addAddress(bondTokenAddr)
                .addAddress(paymentTokenAddr)
                .addUint256(faceValue)
                .addUint256(rate)
                .addUint8(frequency)
                .addUint256(startDate)
                .addUint256(maturityDate)
                .addAddress(operatorId.toSolidityAddress()),
        );

    const registerResponse = await registerTx.execute(client);
    const registerReceipt = await registerResponse.getReceipt(client);
    console.log(`Register bond status: ${registerReceipt.status.toString()}`);

    // Step 3: Query bond count
    console.log('\n--- Step 3: Verify Bond ---');
    const countQuery = new ContractCallQuery()
        .setContractId(schedulerContractId)
        .setGas(100_000)
        .setFunction('bondCount');

    const countResult = await countQuery.execute(client);
    const bondCount = countResult.getUint256(0);
    console.log(`Bond count: ${bondCount.toString()}`);

    // Step 4: Query payment dates
    console.log('\n--- Step 4: Query Payment Dates ---');
    const datesQuery = new ContractCallQuery()
        .setContractId(schedulerContractId)
        .setGas(200_000)
        .setFunction(
            'getPaymentDates',
            new ContractFunctionParameters().addUint256(0),
        );

    const datesResult = await datesQuery.execute(client);
    console.log(`Payment dates query returned successfully`);

    // Step 5: Query coupon amount
    console.log('\n--- Step 5: Query Coupon Amount ---');
    const amountQuery = new ContractCallQuery()
        .setContractId(schedulerContractId)
        .setGas(100_000)
        .setFunction(
            'getCouponAmount',
            new ContractFunctionParameters().addUint256(0),
        );

    const amountResult = await amountQuery.execute(client);
    const couponAmount = amountResult.getUint256(0);
    console.log(`Coupon amount per period: ${couponAmount.toString()}`);

    console.log('\n=== E2E Test Complete ===');
    console.log('All contract interactions succeeded on Hedera Testnet.');
}

main().catch((err) => {
    console.error('E2E test failed:', err);
    process.exit(1);
});
