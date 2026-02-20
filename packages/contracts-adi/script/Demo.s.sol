// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { RWAToken } from "../src/RWAToken.sol";
import { VaultManager } from "../src/VaultManager.sol";
import { InstitutionRegistry } from "../src/InstitutionRegistry.sol";

/// @title InstiVault Live Demo Script
/// @notice Run: forge script script/Demo.s.sol --rpc-url $ADI_RPC_URL --broadcast
contract Demo is Script {
    function run() external {
        uint256 pk = vm.envUint("ADI_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // Load deployed addresses
        address acAddr = vm.envAddress("ADI_ACCESS_CONTROL_ADDRESS");
        address factoryAddr = vm.envAddress("ADI_TOKEN_FACTORY_ADDRESS");
        address vmAddr = vm.envAddress("ADI_VAULT_MANAGER_ADDRESS");
        address registryAddr = vm.envAddress("ADI_INSTITUTION_REGISTRY_ADDRESS");

        InstiVaultAccessControl ac = InstiVaultAccessControl(acAddr);
        RWATokenFactory factory = RWATokenFactory(factoryAddr);
        VaultManager vaultMgr = VaultManager(vmAddr);
        InstitutionRegistry registry = InstitutionRegistry(registryAddr);

        vm.startBroadcast(pk);

        console.log("========================================");
        console.log("  InstiVault - Live Demo on Sepolia");
        console.log("========================================");
        console.log("Operator:", deployer);
        console.log("");

        // ─── Step 1: Setup Roles ──────────────────────────────────
        console.log("[1/6] Setting up roles...");
        // Deployer is already ADMIN. Grant ISSUER + INVESTOR to self for demo.
        if (!ac.hasRole(ac.ISSUER_ROLE(), deployer)) {
            ac.grantRole(ac.ISSUER_ROLE(), deployer);
            console.log("  -> Granted ISSUER_ROLE");
        }
        if (!ac.hasRole(ac.INVESTOR_ROLE(), deployer)) {
            ac.grantRole(ac.INVESTOR_ROLE(), deployer);
            console.log("  -> Granted INVESTOR_ROLE");
        }
        // Whitelist deployer for token transfers
        if (!ac.isWhitelisted(deployer)) {
            ac.addToWhitelist(deployer);
            console.log("  -> Whitelisted deployer");
        }

        // ─── Step 2: Create RWA Token ─────────────────────────────
        console.log("");
        console.log("[2/6] Creating RWA Token...");
        address tokenAddr = factory.createToken(
            RWATokenFactory.TokenParams({
                name: "InstiVault Euro Bond 2026",
                symbol: "ivEUR26",
                isin: string.concat("FR", vm.toString(block.timestamp)),
                rate: 450, // 4.50% annual
                maturity: block.timestamp + 365 days,
                initialSupply: 1_000_000e18
            })
        );
        console.log("  -> Token deployed:", tokenAddr);
        console.log("  -> Supply: 1,000,000 ivEUR26");
        console.log("  -> Rate: 4.50% | Maturity: +1 year");

        // ─── Step 3: Create Vault ─────────────────────────────────
        console.log("");
        console.log("[3/6] Creating Vault...");
        uint256 vaultId = vaultMgr.createVault();
        console.log("  -> Vault ID:", vaultId);

        // ─── Step 4: Deposit into Vault ───────────────────────────
        console.log("");
        console.log("[4/6] Depositing 100,000 tokens into vault...");
        uint256 depositAmount = 100_000e18;
        RWAToken(tokenAddr).approve(vmAddr, depositAmount);
        vaultMgr.deposit(vaultId, tokenAddr, depositAmount);
        console.log("  -> Deposited 100,000 ivEUR26");

        // ─── Step 5: Allocate to Strategy ─────────────────────────
        console.log("");
        console.log("[5/6] Allocating 50,000 tokens to 'yield-farming' strategy...");
        uint256 allocAmount = 50_000e18;
        vaultMgr.allocate(vaultId, tokenAddr, keccak256("yield-farming"), allocAmount);
        console.log("  -> Allocated 50,000 to yield-farming");

        // ─── Step 6: Verify State ─────────────────────────────────
        console.log("");
        console.log("[6/6] Verifying final state...");
        uint256 totalBal = vaultMgr.getVaultBalance(vaultId, tokenAddr);
        uint256 availBal = vaultMgr.getAvailableBalance(vaultId, tokenAddr);
        uint256 allocated = vaultMgr.getAllocation(vaultId, tokenAddr, keccak256("yield-farming"));
        console.log("  -> Vault total balance:", totalBal / 1e18);
        console.log("  -> Available (unallocated):", availBal / 1e18);
        console.log("  -> Allocated to yield-farming:", allocated / 1e18);
        console.log("  -> Token count in factory:", factory.getTokenCount());

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("  Demo complete! All on-chain.");
        console.log("========================================");
    }
}
