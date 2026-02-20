// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { VaultManager } from "../src/VaultManager.sol";
import { InstitutionRegistry } from "../src/InstitutionRegistry.sol";

contract InstitutionRegistryTest is Test {
    InstiVaultAccessControl platformAC;
    InstitutionRegistry registry;

    address admin1 = makeAddr("admin1");
    address admin2 = makeAddr("admin2");
    address instAdmin = makeAddr("instAdmin");
    address nobody = makeAddr("nobody");

    function setUp() public {
        vm.startPrank(admin1);
        platformAC = new InstiVaultAccessControl(admin1);
        registry = new InstitutionRegistry(address(platformAC));

        // Grant admin2 as a second platform admin
        platformAC.grantRole(platformAC.ADMIN_ROLE(), admin2);
        vm.stopPrank();
    }

    // ── Direct Registration ──

    function test_registerInstitution_success() public {
        vm.prank(admin1);
        uint256 id = registry.registerInstitution("BNP Paribas", instAdmin);

        assertEq(id, 0);
        (string memory name, address admin, address ac, address factory, address vault, bool active) =
            registry.getInstitution(id);

        assertEq(name, "BNP Paribas");
        assertEq(admin, instAdmin);
        assertTrue(ac != address(0));
        assertTrue(factory != address(0));
        assertTrue(vault != address(0));
        assertTrue(active);
    }

    function test_registerInstitution_deploysIsolatedContracts() public {
        vm.startPrank(admin1);
        uint256 id1 = registry.registerInstitution("Bank A", makeAddr("bankA"));
        uint256 id2 = registry.registerInstitution("Bank B", makeAddr("bankB"));
        vm.stopPrank();

        (,, address ac1, address f1, address v1,) = registry.getInstitution(id1);
        (,, address ac2, address f2, address v2,) = registry.getInstitution(id2);

        // Each institution has different contract instances
        assertTrue(ac1 != ac2);
        assertTrue(f1 != f2);
        assertTrue(v1 != v2);
    }

    function test_registerInstitution_emitsEvent() public {
        vm.prank(admin1);
        vm.expectEmit(true, false, false, false);
        emit InstitutionRegistry.InstitutionRegistered(0, "TestBank", instAdmin, address(0), address(0), address(0));
        registry.registerInstitution("TestBank", instAdmin);
    }

    function test_registerInstitution_revertsNonAdmin() public {
        vm.prank(nobody);
        vm.expectRevert(InstitutionRegistry.NotPlatformAdmin.selector);
        registry.registerInstitution("Bank", instAdmin);
    }

    function test_registerInstitution_revertsEmptyName() public {
        vm.prank(admin1);
        vm.expectRevert(InstitutionRegistry.EmptyName.selector);
        registry.registerInstitution("", instAdmin);
    }

    function test_registerInstitution_revertsZeroAddress() public {
        vm.prank(admin1);
        vm.expectRevert(InstitutionRegistry.ZeroAddress.selector);
        registry.registerInstitution("Bank", address(0));
    }

    function test_institutionCount() public {
        assertEq(registry.getInstitutionCount(), 0);

        vm.startPrank(admin1);
        registry.registerInstitution("A", makeAddr("a"));
        registry.registerInstitution("B", makeAddr("b"));
        vm.stopPrank();

        assertEq(registry.getInstitutionCount(), 2);
    }

    function test_adminInstitutions_tracked() public {
        vm.startPrank(admin1);
        registry.registerInstitution("Bank1", instAdmin);
        registry.registerInstitution("Bank2", instAdmin);
        vm.stopPrank();

        uint256[] memory ids = registry.getAdminInstitutions(instAdmin);
        assertEq(ids.length, 2);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
    }

    // ── Deactivation ──

    function test_deactivateInstitution_success() public {
        vm.prank(admin1);
        uint256 id = registry.registerInstitution("Bank", instAdmin);

        vm.prank(admin1);
        registry.deactivateInstitution(id);

        (,,,,, bool active) = registry.getInstitution(id);
        assertFalse(active);
    }

    function test_deactivateInstitution_emitsEvent() public {
        vm.prank(admin1);
        uint256 id = registry.registerInstitution("Bank", instAdmin);

        vm.expectEmit(true, false, false, false);
        emit InstitutionRegistry.InstitutionDeactivated(id);

        vm.prank(admin1);
        registry.deactivateInstitution(id);
    }

    function test_deactivateInstitution_revertsNotFound() public {
        vm.prank(admin1);
        vm.expectRevert(abi.encodeWithSelector(InstitutionRegistry.InstitutionNotFound.selector, 999));
        registry.deactivateInstitution(999);
    }

    function test_deactivateInstitution_revertsAlreadyInactive() public {
        vm.startPrank(admin1);
        uint256 id = registry.registerInstitution("Bank", instAdmin);
        registry.deactivateInstitution(id);

        vm.expectRevert(abi.encodeWithSelector(InstitutionRegistry.InstitutionNotActive.selector, id));
        registry.deactivateInstitution(id);
        vm.stopPrank();
    }

    // ── Institution Role Isolation ──

    function test_institutionAdmin_hasRolesOnOwnContracts() public {
        vm.prank(admin1);
        uint256 id = registry.registerInstitution("Bank", instAdmin);

        (,, address acAddr,,,) = registry.getInstitution(id);
        InstiVaultAccessControl instAC = InstiVaultAccessControl(acAddr);

        // instAdmin should have ADMIN_ROLE on the institution's AC
        assertTrue(instAC.hasRole(instAC.ADMIN_ROLE(), instAdmin));
        assertTrue(instAC.hasRole(instAC.DEFAULT_ADMIN_ROLE(), instAdmin));
    }

    function test_institutionAdmin_noRolesOnOtherInstitution() public {
        vm.startPrank(admin1);
        uint256 id1 = registry.registerInstitution("Bank A", makeAddr("adminA"));
        uint256 id2 = registry.registerInstitution("Bank B", makeAddr("adminB"));
        vm.stopPrank();

        (,, address ac1,,,) = registry.getInstitution(id1);
        (,, address ac2,,,) = registry.getInstitution(id2);

        InstiVaultAccessControl instAC1 = InstiVaultAccessControl(ac1);
        InstiVaultAccessControl instAC2 = InstiVaultAccessControl(ac2);

        // adminA should NOT have roles on Bank B's contracts
        assertFalse(instAC2.hasRole(instAC2.ADMIN_ROLE(), makeAddr("adminA")));
        // adminB should NOT have roles on Bank A's contracts
        assertFalse(instAC1.hasRole(instAC1.ADMIN_ROLE(), makeAddr("adminB")));
    }

    // ── Multisig Proposal Flow ──

    function test_proposeInstitution_success() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        assertEq(proposalId, 0);
        assertEq(registry.getProposalApprovalCount(proposalId), 1);
        assertTrue(registry.hasApprovedProposal(proposalId, admin1));
        assertFalse(registry.isProposalExecuted(proposalId));
    }

    function test_proposeInstitution_emitsEvent() public {
        vm.prank(admin1);
        vm.expectEmit(true, false, false, true);
        emit InstitutionRegistry.ProposalCreated(0, "SecureBank", instAdmin, admin1);
        registry.proposeInstitution("SecureBank", instAdmin);
    }

    function test_approveProposal_success() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(admin2);
        registry.approveProposal(proposalId);

        assertEq(registry.getProposalApprovalCount(proposalId), 2);
        assertTrue(registry.hasApprovedProposal(proposalId, admin2));
    }

    function test_approveProposal_revertsDoubleApproval() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(admin1);
        vm.expectRevert(abi.encodeWithSelector(InstitutionRegistry.AlreadyApproved.selector, proposalId, admin1));
        registry.approveProposal(proposalId);
    }

    function test_approveProposal_revertsNonAdmin() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(nobody);
        vm.expectRevert(InstitutionRegistry.NotPlatformAdmin.selector);
        registry.approveProposal(proposalId);
    }

    function test_executeProposal_success() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(admin2);
        registry.approveProposal(proposalId);

        vm.prank(admin1);
        uint256 institutionId = registry.executeProposal(proposalId);

        assertTrue(registry.isProposalExecuted(proposalId));
        (string memory name,,,,, bool active) = registry.getInstitution(institutionId);
        assertEq(name, "SecureBank");
        assertTrue(active);
    }

    function test_executeProposal_emitsEvent() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(admin2);
        registry.approveProposal(proposalId);

        vm.expectEmit(true, false, false, true);
        emit InstitutionRegistry.ProposalExecuted(proposalId, 0);

        vm.prank(admin1);
        registry.executeProposal(proposalId);
    }

    function test_executeProposal_revertsInsufficientApprovals() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        // Only 1 approval, need 2
        vm.prank(admin1);
        vm.expectRevert(
            abi.encodeWithSelector(InstitutionRegistry.InsufficientApprovals.selector, proposalId, 1, 2)
        );
        registry.executeProposal(proposalId);
    }

    function test_executeProposal_revertsAlreadyExecuted() public {
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("SecureBank", instAdmin);

        vm.prank(admin2);
        registry.approveProposal(proposalId);

        vm.prank(admin1);
        registry.executeProposal(proposalId);

        vm.prank(admin1);
        vm.expectRevert(abi.encodeWithSelector(InstitutionRegistry.ProposalAlreadyExecuted.selector, proposalId));
        registry.executeProposal(proposalId);
    }

    function test_fullMultisigFlow() public {
        // Admin1 proposes
        vm.prank(admin1);
        uint256 proposalId = registry.proposeInstitution("MultiSigBank", instAdmin);
        assertEq(registry.getProposalApprovalCount(proposalId), 1);

        // Admin2 approves
        vm.prank(admin2);
        registry.approveProposal(proposalId);
        assertEq(registry.getProposalApprovalCount(proposalId), 2);

        // Execute
        vm.prank(admin1);
        uint256 instId = registry.executeProposal(proposalId);

        // Verify institution is deployed and functional
        (string memory name, address admin, address acAddr, address factoryAddr, address vaultAddr, bool active) =
            registry.getInstitution(instId);

        assertEq(name, "MultiSigBank");
        assertEq(admin, instAdmin);
        assertTrue(active);

        // Verify the institution admin can use their contracts
        InstiVaultAccessControl instAC = InstiVaultAccessControl(acAddr);
        assertTrue(instAC.hasRole(instAC.ADMIN_ROLE(), instAdmin));

        // Institution admin can grant issuer role
        bytes32 issuerRole = instAC.ISSUER_ROLE();
        address issuer1 = makeAddr("issuer1");
        vm.prank(instAdmin);
        instAC.grantRole(issuerRole, issuer1);
        assertTrue(instAC.hasRole(issuerRole, issuer1));
    }
}
