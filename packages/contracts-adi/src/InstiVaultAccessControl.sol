// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract InstiVaultAccessControl is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant INVESTOR_ROLE = keccak256("INVESTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    mapping(address => bool) private _whitelist;

    event WhitelistUpdated(address indexed account, bool status);

    error NotWhitelisted(address account);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ISSUER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(INVESTOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
    }

    function addToWhitelist(address account) external onlyRole(ADMIN_ROLE) {
        _whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    function removeFromWhitelist(address account) external onlyRole(ADMIN_ROLE) {
        _whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    function addToWhitelistBatch(address[] calldata accounts) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _whitelist[accounts[i]] = true;
            emit WhitelistUpdated(accounts[i], true);
        }
    }

    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    function checkWhitelisted(address account) external view {
        if (!_whitelist[account]) {
            revert NotWhitelisted(account);
        }
    }
}
