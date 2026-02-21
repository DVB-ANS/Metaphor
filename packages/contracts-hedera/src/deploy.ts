import "dotenv/config";
import {
    ContractCreateFlow,
    ContractFunctionParameters,
} from "@hashgraph/sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getHederaClient, getOperatorEvmAddress } from "./config";

async function main() {
    const client = getHederaClient();
    const operatorId = client.operatorAccountId!;

    // IMPORTANT: Use the ECDSA-derived EVM address, NOT operatorId.toSolidityAddress().
    // On Hedera, msg.sender in the EVM resolves to this ECDSA alias address,
    // so Ownable.owner() must store this format for onlyOwner checks to pass.
    const adminAddress = getOperatorEvmAddress();

    console.log("Deploying contracts to Hedera Testnet...");
    console.log(`Operator: ${operatorId.toString()}`);
    console.log(`Admin EVM address (ECDSA alias): 0x${adminAddress}`);

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
        .setGas(5_000_000)
        .setConstructorParameters(
            new ContractFunctionParameters().addAddress(adminAddress)
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
        .setGas(5_000_000)
        .setConstructorParameters(
            new ContractFunctionParameters().addAddress(adminAddress)
        );

    const distributorResponse = await distributorTx.execute(client);
    const distributorReceipt = await distributorResponse.getReceipt(client);
    const distributorContractId = distributorReceipt.contractId!;
    console.log(`   YieldDistributor deployed: ${distributorContractId.toString()}`);
    console.log(`   EVM address: ${distributorContractId.toSolidityAddress()}`);

    const deployments = {
        network: process.env.HEDERA_NETWORK || 'testnet',
        deployer: operatorId.toString(),
        adminEvmAddress: adminAddress,
        deployedAt: new Date().toISOString(),
        contracts: {
            couponScheduler: {
                contractId: schedulerContractId.toString(),
                evmAddress: schedulerContractId.toSolidityAddress(),
            },
            yieldDistributor: {
                contractId: distributorContractId.toString(),
                evmAddress: distributorContractId.toSolidityAddress(),
            },
        },
    };

    const deploymentsPath = resolve(__dirname, '../deployments.json');
    writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + '\n');
    console.log(`\nDeployment complete! Addresses saved to ${deploymentsPath}`);
    console.log(JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
