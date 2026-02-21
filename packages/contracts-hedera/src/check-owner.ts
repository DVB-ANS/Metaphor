import "dotenv/config";
import { ContractCallQuery, ContractId } from "@hashgraph/sdk";
import { getHederaClient, getOperatorEvmAddress } from "./config";
import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
    const client = getHederaClient();

    // Read deployed contract ID from deployments.json
    const deployments = JSON.parse(
        readFileSync(resolve(__dirname, "../deployments.json"), "utf-8")
    );
    const contractId = ContractId.fromString(
        deployments.contracts.couponScheduler.contractId
    );

    const ownerQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100_000)
        .setFunction("owner");

    const ownerResult = await ownerQuery.execute(client);
    const contractOwner = ownerResult.getAddress(0);
    const longZeroAddr = client.operatorAccountId!.toSolidityAddress();
    const ecdsaAlias = getOperatorEvmAddress();

    console.log("Contract owner (from contract):", contractOwner);
    console.log("Operator long-zero addr:        ", longZeroAddr);
    console.log("Operator ECDSA alias (EVM addr): ", ecdsaAlias);
    console.log();

    const ownerNormalized = contractOwner.toLowerCase();
    if (ownerNormalized === ecdsaAlias.toLowerCase()) {
        console.log("MATCH: owner() == ECDSA alias -> onlyOwner will PASS");
    } else if (ownerNormalized === longZeroAddr.toLowerCase()) {
        console.log("MISMATCH: owner() is long-zero but msg.sender will be ECDSA alias -> onlyOwner will REVERT");
        console.log("FIX: Redeploy with ECDSA alias as admin (run `pnpm deploy`)");
    } else {
        console.log("UNKNOWN: owner does not match either format");
    }
}

main().catch(console.error);
