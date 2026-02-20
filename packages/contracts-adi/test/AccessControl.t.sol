// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";

contract AccessControlTest is Test {
    InstiVaultAccessControl ac;

    address admin = makeAddr("admin");
    address issuer = makeAddr("issuer");
    address investor = makeAddr("investor");
    address auditor = makeAddr("auditor");
    address nobody = makeAddr("nobody");

    function setUp() public {
        vm.prank(admin);
        ac = new InstiVaultAccessControl(admin);

        vm.startPrank(admin);
        ac.grantRole(ac.ISSUER_ROLE(), issuer);
        ac.grantRole(ac.INVESTOR_ROLE(), investor);
        ac.grantRole(ac.AUDITOR_ROLE(), auditor);
        vm.stopPrank();
    }

    // ── Role assignment ──

    function test_AdminHasDefaultAdminRole() public view {
        assertTrue(ac.hasRole(ac.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_AdminHasAdminRole() public view {
        assertTrue(ac.hasRole(ac.ADMIN_ROLE(), admin));
    }

    function test_IssuerHasIssuerRole() public view {
        assertTrue(ac.hasRole(ac.ISSUER_ROLE(), issuer));
    }

    function test_InvestorHasInvestorRole() public view {
        assertTrue(ac.hasRole(ac.INVESTOR_ROLE(), investor));
    }

    function test_AuditorHasAuditorRole() public view {
        assertTrue(ac.hasRole(ac.AUDITOR_ROLE(), auditor));
    }

    function test_NobodyHasNoRoles() public view {
        assertFalse(ac.hasRole(ac.ADMIN_ROLE(), nobody));
        assertFalse(ac.hasRole(ac.ISSUER_ROLE(), nobody));
        assertFalse(ac.hasRole(ac.INVESTOR_ROLE(), nobody));
        assertFalse(ac.hasRole(ac.AUDITOR_ROLE(), nobody));
    }

    // ── Role revocation ──

    function test_AdminCanRevokeIssuer() public {
        bytes32 issuerRole = ac.ISSUER_ROLE();
        vm.prank(admin);
        ac.revokeRole(issuerRole, issuer);
        assertFalse(ac.hasRole(issuerRole, issuer));
    }

    function test_NonAdminCannotGrantRole() public {
        bytes32 issuerRole = ac.ISSUER_ROLE();
        vm.prank(nobody);
        vm.expectRevert();
        ac.grantRole(issuerRole, nobody);
    }

    function test_NonAdminCannotRevokeRole() public {
        bytes32 issuerRole = ac.ISSUER_ROLE();
        vm.prank(nobody);
        vm.expectRevert();
        ac.revokeRole(issuerRole, issuer);
    }

    // ── Whitelist ──

    function test_AddToWhitelist() public {
        vm.prank(admin);
        ac.addToWhitelist(investor);
        assertTrue(ac.isWhitelisted(investor));
    }

    function test_RemoveFromWhitelist() public {
        vm.startPrank(admin);
        ac.addToWhitelist(investor);
        ac.removeFromWhitelist(investor);
        vm.stopPrank();
        assertFalse(ac.isWhitelisted(investor));
    }

    function test_BatchWhitelist() public {
        address[] memory accounts = new address[](3);
        accounts[0] = issuer;
        accounts[1] = investor;
        accounts[2] = auditor;

        vm.prank(admin);
        ac.addToWhitelistBatch(accounts);

        assertTrue(ac.isWhitelisted(issuer));
        assertTrue(ac.isWhitelisted(investor));
        assertTrue(ac.isWhitelisted(auditor));
    }

    function test_NonAdminCannotWhitelist() public {
        vm.prank(nobody);
        vm.expectRevert();
        ac.addToWhitelist(nobody);
    }

    function test_NonAdminCannotRemoveWhitelist() public {
        vm.startPrank(admin);
        ac.addToWhitelist(investor);
        vm.stopPrank();

        vm.prank(nobody);
        vm.expectRevert();
        ac.removeFromWhitelist(investor);
    }

    function test_CheckWhitelistedReverts() public {
        vm.expectRevert(abi.encodeWithSelector(InstiVaultAccessControl.NotWhitelisted.selector, nobody));
        ac.checkWhitelisted(nobody);
    }

    function test_CheckWhitelistedPasses() public {
        vm.prank(admin);
        ac.addToWhitelist(investor);
        // Should not revert
        ac.checkWhitelisted(investor);
    }

    // ── Events ──

    function test_WhitelistUpdateEmitsEvent() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit InstiVaultAccessControl.WhitelistUpdated(investor, true);
        ac.addToWhitelist(investor);
    }
}
