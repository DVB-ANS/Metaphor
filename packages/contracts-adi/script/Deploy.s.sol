// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { VaultManager } from "../src/VaultManager.sol";
import { InstitutionDeployer } from "../src/InstitutionDeployer.sol";
import { InstitutionRegistry } from "../src/InstitutionRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== InstiVault ADI Deploy ===");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        InstiVaultAccessControl accessControl = new InstiVaultAccessControl(deployer);
        console.log("InstiVaultAccessControl:", address(accessControl));

        RWATokenFactory tokenFactory = new RWATokenFactory(address(accessControl));
        console.log("RWATokenFactory:", address(tokenFactory));

        VaultManager vaultManager = new VaultManager(address(accessControl), address(tokenFactory));
        console.log("VaultManager:", address(vaultManager));

        InstitutionDeployer instDeployer = new InstitutionDeployer();
        console.log("InstitutionDeployer:", address(instDeployer));

        InstitutionRegistry registry = new InstitutionRegistry(address(accessControl), address(instDeployer));
        console.log("InstitutionRegistry:", address(registry));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Copy these to your .env ===");
        console.log("ADI_ACCESS_CONTROL_ADDRESS=", address(accessControl));
        console.log("ADI_TOKEN_FACTORY_ADDRESS=", address(tokenFactory));
        console.log("ADI_VAULT_MANAGER_ADDRESS=", address(vaultManager));
        console.log("ADI_INSTITUTION_REGISTRY_ADDRESS=", address(registry));
    }
}
