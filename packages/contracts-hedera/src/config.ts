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

/**
 * Returns the operator's EVM address (ECDSA alias).
 *
 * On Hedera, msg.sender in the EVM resolves to this ECDSA-derived address
 * (keccak256 of the public key), NOT the long-zero address from
 * AccountId.toSolidityAddress(). This MUST be used for Ownable admin,
 * issuer addresses, and any address compared against msg.sender.
 */
export function getOperatorEvmAddress(): string {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY || process.env.HEDERA_PRIVATE_KEY;
    if (!operatorKey) throw new Error("Missing HEDERA_OPERATOR_KEY in .env");
    const privateKey = PrivateKey.fromStringDer(operatorKey);
    return privateKey.publicKey.toEvmAddress();
}
