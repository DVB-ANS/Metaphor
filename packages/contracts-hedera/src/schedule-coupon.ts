import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    ContractId,
} from "@hashgraph/sdk";
import { getHederaClient } from "./config";

async function main() {
    const client = getHederaClient();
    const contractId = process.env.COUPON_SCHEDULER_CONTRACT_ID;

    if (!contractId) {
        throw new Error("Missing COUPON_SCHEDULER_CONTRACT_ID in .env");
    }

    const schedulerContractId = ContractId.fromString(contractId);

    // Step 1: Authorize the contract with Hedera Schedule Service
    console.log("1. Authorizing contract with Schedule Service...");
    const authTx = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(500_000)
        .setFunction("authorize");

    const authResponse = await authTx.execute(client);
    const authReceipt = await authResponse.getReceipt(client);
    console.log(`   Authorization status: ${authReceipt.status.toString()}`);

    // Step 2: Query bond count
    console.log("\n2. Querying bond count...");
    const countQuery = new ContractCallQuery()
        .setContractId(schedulerContractId)
        .setGas(100_000)
        .setFunction("bondCount");

    const countResult = await countQuery.execute(client);
    const bondCount = countResult.getUint256(0);
    console.log(`   Bond count: ${bondCount.toString()}`);

    if (bondCount.isZero()) {
        console.log("\n   No bonds registered. Register a bond first.");
        return;
    }

    // Step 3: Schedule all coupons for bond 0
    const bondId = 0;
    console.log(`\n3. Scheduling all coupons for bond ${bondId}...`);
    const scheduleTx = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(1_000_000)
        .setFunction(
            "scheduleAllCoupons",
            new ContractFunctionParameters().addUint256(bondId)
        );

    const scheduleResponse = await scheduleTx.execute(client);
    const scheduleReceipt = await scheduleResponse.getReceipt(client);
    console.log(
        `   Schedule status: ${scheduleReceipt.status.toString()}`
    );

    console.log("\nDone! Coupons are scheduled via Hedera Schedule Service.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
