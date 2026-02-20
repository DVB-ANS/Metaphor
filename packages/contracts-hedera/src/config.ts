import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";

export function getHederaClient(): Client {
    const operatorId = process.env.HEDERA_OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY || process.env.HEDERA_PRIVATE_KEY;
    const network = process.env.HEDERA_NETWORK || "testnet";

    if (!operatorId || !operatorKey) {
        throw new Error(
            "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in .env"
        );
    }

    const client =
        network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromStringDer(operatorKey)
    );

    return client;
}
