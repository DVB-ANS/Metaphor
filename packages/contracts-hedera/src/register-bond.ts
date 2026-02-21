import "dotenv/config";
import {
    ContractExecuteTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    ContractId,
} from "@hashgraph/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getHederaClient, getOperatorEvmAddress } from "./config";

async function main() {
    const client = getHederaClient();

    // Read deployed contract ID from deployments.json
    const deployments = JSON.parse(
        readFileSync(resolve(__dirname, "../deployments.json"), "utf-8")
    );
    const schedulerContractId = ContractId.fromString(
        deployments.contracts.couponScheduler.contractId
    );

    // Use the ECDSA-derived EVM address for issuer (matches msg.sender in EVM)
    const issuerEvmAddress = getOperatorEvmAddress();

    // Bond params — France OAT 2028 (face value in 6-decimal USDC-style)
    const token = "0x543073CAdD1d8Bcfa98223415EA140461Bfe1eb5";
    const paymentToken = token;
    const faceValue = 1_000_000_000; // 1000 tokens (6 decimals)
    const rate = 210; // 2.1% in basis points
    const frequency = 1; // Quarterly
    const startDate = Math.floor(Date.now() / 1000) + 86400; // tomorrow
    const maturityDate = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now

    console.log("Registering bond on CouponScheduler...");
    console.log(`  Contract: ${schedulerContractId.toString()}`);
    console.log(`  Token: ${token}`);
    console.log(`  Rate: ${rate} bps (${rate / 100}%)`);
    console.log(`  Frequency: Quarterly`);
    console.log(`  Issuer (EVM alias): 0x${issuerEvmAddress}`);

    const registerTx = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(3_000_000)
        .setFunction(
            "registerBond",
            new ContractFunctionParameters()
                .addAddress(token)
                .addAddress(paymentToken)
                .addUint256(faceValue)
                .addUint256(rate)
                .addUint8(frequency)
                .addUint256(startDate)
                .addUint256(maturityDate)
                .addAddress(issuerEvmAddress)
        );

    const response = await registerTx.execute(client);
    const receipt = await response.getReceipt(client);
    console.log(`\nBond 1 registered! Status: ${receipt.status.toString()}`);

    // Register Bond 2 — US Treasury
    console.log("\nRegistering bond 2: US Treasury 10Y 2035...");
    const registerTx2 = new ContractExecuteTransaction()
        .setContractId(schedulerContractId)
        .setGas(3_000_000)
        .setFunction(
            "registerBond",
            new ContractFunctionParameters()
                .addAddress("0x8689df8C3AF99975E822484b5527745A407E7326")
                .addAddress("0x8689df8C3AF99975E822484b5527745A407E7326")
                .addUint256(1_000_000_000) // 1000 tokens (6 decimals)
                .addUint256(350) // 3.5%
                .addUint8(2) // SemiAnnual
                .addUint256(startDate)
                .addUint256(maturityDate)
                .addAddress(issuerEvmAddress)
        );

    const response2 = await registerTx2.execute(client);
    const receipt2 = await response2.getReceipt(client);
    console.log(`Bond 2 registered! Status: ${receipt2.status.toString()}`);

    // Verify
    console.log("\nVerifying bond count...");
    const countQuery = new ContractCallQuery()
        .setContractId(schedulerContractId)
        .setGas(100_000)
        .setFunction("bondCount");

    const countResult = await countQuery.execute(client);
    console.log(`Bond count: ${countResult.getUint256(0).toString()}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
