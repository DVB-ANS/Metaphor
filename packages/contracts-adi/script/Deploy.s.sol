// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { VaultManager } from "../src/VaultManager.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        InstiVaultAccessControl accessControl = new InstiVaultAccessControl(deployer);
        console.log("InstiVaultAccessControl:", address(accessControl));

        RWATokenFactory tokenFactory = new RWATokenFactory(address(accessControl));
        console.log("RWATokenFactory:", address(tokenFactory));

        VaultManager vaultManager = new VaultManager(address(accessControl), address(tokenFactory));
        console.log("VaultManager:", address(vaultManager));

        vm.stopBroadcast();
    }
}
