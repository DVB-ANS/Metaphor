import {
    ContractCreateFlow,
    ContractFunctionParameters,
} from "@hashgraph/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getHederaClient } from "./config";

async function main() {
    const client = getHederaClient();
    const operatorId = client.operatorAccountId!;

    console.log("Deploying contracts to Hedera Testnet...");
    console.log(`Operator: ${operatorId.toString()}`);

    // Read compiled bytecodes
    const schedulerBytecode = readFileSync(
        resolve(
            __dirname,
            "../out/CouponScheduler.sol/CouponScheduler.json"
        ),
        "utf-8"
    );
    const distributorBytecode = readFileSync(
        resolve(
            __dirname,
            "../out/YieldDistributor.sol/YieldDistributor.json"
        ),
        "utf-8"
    );

    const schedulerJson = JSON.parse(schedulerBytecode);
    const distributorJson = JSON.parse(distributorBytecode);

    // Deploy CouponScheduler
    console.log("\n1. Deploying CouponScheduler...");
    const schedulerTx = new ContractCreateFlow()
        .setBytecode(schedulerJson.bytecode.object)
        .setGas(2_000_000)
        .setConstructorParameters(
            new ContractFunctionParameters().addAddress(
                operatorId.toSolidityAddress()
            )
        );

    const schedulerResponse = await schedulerTx.execute(client);
    const schedulerReceipt = await schedulerResponse.getReceipt(client);
    const schedulerContractId = schedulerReceipt.contractId!;
    console.log(`   CouponScheduler deployed: ${schedulerContractId.toString()}`);
    console.log(`   EVM address: ${schedulerContractId.toSolidityAddress()}`);

    // Deploy YieldDistributor
    console.log("\n2. Deploying YieldDistributor...");
    const distributorTx = new ContractCreateFlow()
        .setBytecode(distributorJson.bytecode.object)
        .setGas(2_000_000)
        .setConstructorParameters(
            new ContractFunctionParameters().addAddress(
                operatorId.toSolidityAddress()
            )
        );

    const distributorResponse = await distributorTx.execute(client);
    const distributorReceipt = await distributorResponse.getReceipt(client);
    const distributorContractId = distributorReceipt.contractId!;
    console.log(`   YieldDistributor deployed: ${distributorContractId.toString()}`);
    console.log(`   EVM address: ${distributorContractId.toSolidityAddress()}`);

    console.log("\nDeployment complete!");
    console.log(
        JSON.stringify(
            {
                couponScheduler: schedulerContractId.toString(),
                yieldDistributor: distributorContractId.toString(),
            },
            null,
            2
        )
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
