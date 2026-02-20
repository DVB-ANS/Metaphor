// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { InstiVaultAccessControl } from "./InstiVaultAccessControl.sol";
import { RWATokenFactory } from "./RWATokenFactory.sol";
import { VaultManager } from "./VaultManager.sol";

/// @title InstitutionDeployer
/// @notice Deploys isolated contract sets for new institutions (keeps InstitutionRegistry under EIP-170 size limit)
contract InstitutionDeployer {
    function deploy(address admin)
        external
        returns (address accessControl, address tokenFactory, address vaultManager)
    {
        InstiVaultAccessControl ac = new InstiVaultAccessControl(admin);
        RWATokenFactory factory = new RWATokenFactory(address(ac));
        VaultManager vault = new VaultManager(address(ac), address(factory));
        return (address(ac), address(factory), address(vault));
    }
}
