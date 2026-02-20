// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { RWAToken } from "../src/RWAToken.sol";
import { VaultManager } from "../src/VaultManager.sol";

contract VaultManagerTest is Test {
    InstiVaultAccessControl ac;
    RWATokenFactory factory;
    VaultManager vault;
    RWAToken token;

    address admin = makeAddr("admin");
    address issuer = makeAddr("issuer");
    address investor = makeAddr("investor");
    address investor2 = makeAddr("investor2");
    address nobody = makeAddr("nobody");

    uint256 constant INITIAL_SUPPLY = 1_000_000e18;

    function setUp() public {
        vm.startPrank(admin);
        ac = new InstiVaultAccessControl(admin);
        factory = new RWATokenFactory(address(ac));
        vault = new VaultManager(address(ac), address(factory));

        ac.grantRole(ac.ISSUER_ROLE(), issuer);
        ac.grantRole(ac.INVESTOR_ROLE(), investor);
        ac.grantRole(ac.INVESTOR_ROLE(), investor2);
        ac.addToWhitelist(issuer);
        ac.addToWhitelist(investor);
        ac.addToWhitelist(investor2);
        ac.addToWhitelist(address(vault));
        vm.stopPrank();

        // Create a token
        vm.prank(issuer);
        address tokenAddr = factory.createToken(
            RWATokenFactory.TokenParams({
                name: "French Gov Bond 2030",
                symbol: "FGB30",
                isin: "FR0000000001",
                rate: 500,
                maturity: 1893456000,
                initialSupply: INITIAL_SUPPLY
            })
        );
        token = RWAToken(tokenAddr);

        // Issuer distributes tokens to investors
        vm.startPrank(issuer);
        token.transfer(investor, 100_000e18);
        token.transfer(investor2, 50_000e18);
        vm.stopPrank();
    }

    // ── Vault creation ──

    function test_IssuerCanCreateVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        assertEq(vaultId, 0);
        (address owner, VaultManager.VaultStatus status, uint256 createdAt) = vault.getVaultInfo(vaultId);
        assertEq(owner, issuer);
        assertEq(uint256(status), uint256(VaultManager.VaultStatus.Active));
        assertGt(createdAt, 0);
    }

    function test_NonIssuerCannotCreateVault() public {
        vm.prank(nobody);
        vm.expectRevert(VaultManager.NotIssuer.selector);
        vault.createVault();
    }

    function test_InvestorCannotCreateVault() public {
        vm.prank(investor);
        vm.expectRevert(VaultManager.NotIssuer.selector);
        vault.createVault();
    }

    function test_MultipleVaults() public {
        vm.startPrank(issuer);
        uint256 v0 = vault.createVault();
        uint256 v1 = vault.createVault();
        vm.stopPrank();

        assertEq(v0, 0);
        assertEq(v1, 1);
    }

    // ── Deposits ──

    function test_InvestorCanDeposit() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vm.stopPrank();

        assertEq(vault.getVaultBalance(vaultId, address(token)), 10_000e18);
        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 10_000e18);
    }

    function test_MultipleDeposits() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 20_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vault.deposit(vaultId, address(token), 5_000e18);
        vm.stopPrank();

        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 15_000e18);
        assertEq(vault.getVaultBalance(vaultId, address(token)), 15_000e18);
    }

    function test_MultipleInvestorsDeposit() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vm.stopPrank();

        vm.startPrank(investor2);
        token.approve(address(vault), 5_000e18);
        vault.deposit(vaultId, address(token), 5_000e18);
        vm.stopPrank();

        assertEq(vault.getVaultBalance(vaultId, address(token)), 15_000e18);
        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 10_000e18);
        assertEq(vault.getDepositorBalance(vaultId, address(token), investor2), 5_000e18);
    }

    function test_NonInvestorCannotDeposit() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(nobody);
        vm.expectRevert(VaultManager.NotInvestor.selector);
        vault.deposit(vaultId, address(token), 1000e18);
    }

    function test_NonWhitelistedCannotDeposit() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        // Remove investor from whitelist but keep role
        vm.prank(admin);
        ac.removeFromWhitelist(investor);

        vm.startPrank(investor);
        token.approve(address(vault), 1000e18);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.NotWhitelisted.selector, investor));
        vault.deposit(vaultId, address(token), 1000e18);
        vm.stopPrank();
    }

    function test_DepositZeroAmountReverts() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(investor);
        vm.expectRevert(VaultManager.ZeroAmount.selector);
        vault.deposit(vaultId, address(token), 0);
    }

    function test_DepositUnregisteredTokenReverts() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.TokenNotRegistered.selector, address(0xdead)));
        vault.deposit(vaultId, address(0xdead), 1000e18);
    }

    function test_DepositToNonExistentVaultReverts() public {
        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.VaultDoesNotExist.selector, 999));
        vault.deposit(999, address(token), 1000e18);
    }

    // ── Withdrawals ──

    function test_InvestorCanWithdraw() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vault.withdraw(vaultId, address(token), 4_000e18);
        vm.stopPrank();

        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 6_000e18);
        assertEq(vault.getVaultBalance(vaultId, address(token)), 6_000e18);
        assertEq(token.balanceOf(investor), 94_000e18); // 100k - 10k + 4k
    }

    function test_WithdrawMoreThanDepositedReverts() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                VaultManager.InsufficientBalance.selector, vaultId, address(token), 20_000e18, 10_000e18
            )
        );
        vault.withdraw(vaultId, address(token), 20_000e18);
        vm.stopPrank();
    }

    function test_WithdrawZeroAmountReverts() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(investor);
        vm.expectRevert(VaultManager.ZeroAmount.selector);
        vault.withdraw(vaultId, address(token), 0);
    }

    function test_CannotWithdrawOtherInvestorDeposit() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vm.stopPrank();

        // investor2 tries to withdraw investor's deposit
        vm.prank(investor2);
        vm.expectRevert(
            abi.encodeWithSelector(VaultManager.InsufficientBalance.selector, vaultId, address(token), 5_000e18, 0)
        );
        vault.withdraw(vaultId, address(token), 5_000e18);
    }

    // ── Vault status management ──

    function test_AdminCanPauseVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(admin);
        vault.pauseVault(vaultId);

        (, VaultManager.VaultStatus status,) = vault.getVaultInfo(vaultId);
        assertEq(uint256(status), uint256(VaultManager.VaultStatus.Paused));
    }

    function test_AdminCanUnpauseVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(admin);
        vault.pauseVault(vaultId);
        vault.unpauseVault(vaultId);
        vm.stopPrank();

        (, VaultManager.VaultStatus status,) = vault.getVaultInfo(vaultId);
        assertEq(uint256(status), uint256(VaultManager.VaultStatus.Active));
    }

    function test_AdminCanCloseVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(admin);
        vault.closeVault(vaultId);

        (, VaultManager.VaultStatus status,) = vault.getVaultInfo(vaultId);
        assertEq(uint256(status), uint256(VaultManager.VaultStatus.Closed));
    }

    function test_NonAdminCannotPauseVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(nobody);
        vm.expectRevert(VaultManager.NotAdmin.selector);
        vault.pauseVault(vaultId);
    }

    function test_CannotDepositToPausedVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(admin);
        vault.pauseVault(vaultId);

        vm.startPrank(investor);
        token.approve(address(vault), 1000e18);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.VaultNotActive.selector, vaultId));
        vault.deposit(vaultId, address(token), 1000e18);
        vm.stopPrank();
    }

    function test_CannotWithdrawFromClosedVault() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        // Deposit first
        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 10_000e18);
        vm.stopPrank();

        // Close vault
        vm.prank(admin);
        vault.closeVault(vaultId);

        // Try to withdraw
        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.VaultNotActive.selector, vaultId));
        vault.withdraw(vaultId, address(token), 5_000e18);
    }

    // ── Vault tokens tracking ──

    function test_VaultTokensTracked() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 10_000e18);
        vault.deposit(vaultId, address(token), 5_000e18);
        vault.deposit(vaultId, address(token), 5_000e18); // Same token again
        vm.stopPrank();

        address[] memory tokens = vault.getVaultTokens(vaultId);
        assertEq(tokens.length, 1); // Only tracked once
        assertEq(tokens[0], address(token));
    }

    // ── Events ──

    function test_VaultCreatedEventEmitted() public {
        vm.prank(issuer);
        vm.expectEmit(true, true, false, true);
        emit VaultManager.VaultCreated(0, issuer);
        vault.createVault();
    }

    function test_DepositedEventEmitted() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 1000e18);
        vm.expectEmit(true, true, true, true);
        emit VaultManager.Deposited(vaultId, address(token), investor, 1000e18);
        vault.deposit(vaultId, address(token), 1000e18);
        vm.stopPrank();
    }

    function test_WithdrawnEventEmitted() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), 1000e18);
        vault.deposit(vaultId, address(token), 1000e18);

        vm.expectEmit(true, true, true, true);
        emit VaultManager.Withdrawn(vaultId, address(token), investor, 500e18);
        vault.withdraw(vaultId, address(token), 500e18);
        vm.stopPrank();
    }

    function test_VaultStatusChangedEventEmitted() public {
        vm.prank(issuer);
        uint256 vaultId = vault.createVault();

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VaultManager.VaultStatusChanged(vaultId, VaultManager.VaultStatus.Paused);
        vault.pauseVault(vaultId);
    }

    // ── Allocation ──

    bytes32 constant STRAT_A = keccak256("STRATEGY_A");
    bytes32 constant STRAT_B = keccak256("STRATEGY_B");

    function _createVaultAndDeposit(uint256 depositAmount) internal returns (uint256 vaultId) {
        vm.prank(issuer);
        vaultId = vault.createVault();

        vm.startPrank(investor);
        token.approve(address(vault), depositAmount);
        vault.deposit(vaultId, address(token), depositAmount);
        vm.stopPrank();
    }

    function test_allocate_success() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 4_000e18);

        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 4_000e18);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 6_000e18);
    }

    function test_allocate_emitsEvent() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(issuer);
        vm.expectEmit(true, true, true, true);
        emit VaultManager.Allocated(vaultId, address(token), STRAT_A, 5_000e18);
        vault.allocate(vaultId, address(token), STRAT_A, 5_000e18);
    }

    function test_allocate_multipleStrategies() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.startPrank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 3_000e18);
        vault.allocate(vaultId, address(token), STRAT_B, 4_000e18);
        vm.stopPrank();

        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 3_000e18);
        assertEq(vault.getAllocation(vaultId, address(token), STRAT_B), 4_000e18);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 3_000e18);
    }

    function test_allocate_revertsInsufficientBalance() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(
                VaultManager.InsufficientAvailableBalance.selector, vaultId, address(token), 15_000e18, 10_000e18
            )
        );
        vault.allocate(vaultId, address(token), STRAT_A, 15_000e18);
    }

    function test_allocate_revertsNonIssuer() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(investor);
        vm.expectRevert(VaultManager.NotIssuer.selector);
        vault.allocate(vaultId, address(token), STRAT_A, 1_000e18);
    }

    function test_allocate_revertsInactiveVault() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(admin);
        vault.pauseVault(vaultId);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(VaultManager.VaultNotActive.selector, vaultId));
        vault.allocate(vaultId, address(token), STRAT_A, 1_000e18);
    }

    function test_allocate_revertsZeroAmount() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(issuer);
        vm.expectRevert(VaultManager.ZeroAmount.selector);
        vault.allocate(vaultId, address(token), STRAT_A, 0);
    }

    function test_deallocate_success() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.startPrank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 5_000e18);
        vault.deallocate(vaultId, address(token), STRAT_A, 2_000e18);
        vm.stopPrank();

        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 3_000e18);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 7_000e18);
    }

    function test_deallocate_emitsEvent() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.startPrank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 5_000e18);

        vm.expectEmit(true, true, true, true);
        emit VaultManager.Deallocated(vaultId, address(token), STRAT_A, 2_000e18);
        vault.deallocate(vaultId, address(token), STRAT_A, 2_000e18);
        vm.stopPrank();
    }

    function test_deallocate_revertsInsufficientAllocation() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.startPrank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 3_000e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                VaultManager.InsufficientAllocation.selector, vaultId, address(token), STRAT_A, 5_000e18, 3_000e18
            )
        );
        vault.deallocate(vaultId, address(token), STRAT_A, 5_000e18);
        vm.stopPrank();
    }

    function test_deallocate_revertsNonIssuer() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.prank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 5_000e18);

        vm.prank(investor);
        vm.expectRevert(VaultManager.NotIssuer.selector);
        vault.deallocate(vaultId, address(token), STRAT_A, 1_000e18);
    }

    function test_getAvailableBalance() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        assertEq(vault.getAvailableBalance(vaultId, address(token)), 10_000e18);

        vm.prank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 6_000e18);

        assertEq(vault.getAvailableBalance(vaultId, address(token)), 4_000e18);
    }

    function test_getAllocation() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 0);

        vm.prank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 7_000e18);

        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 7_000e18);
    }

    function test_withdraw_respectsAllocations() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        // Allocate 8k, leaving only 2k available
        vm.prank(issuer);
        vault.allocate(vaultId, address(token), STRAT_A, 8_000e18);

        // Investor tries to withdraw 5k (has 10k deposited but only 2k vault-available)
        vm.prank(investor);
        vm.expectRevert(
            abi.encodeWithSelector(
                VaultManager.InsufficientAvailableBalance.selector, vaultId, address(token), 5_000e18, 2_000e18
            )
        );
        vault.withdraw(vaultId, address(token), 5_000e18);

        // Withdraw within available should succeed
        vm.prank(investor);
        vault.withdraw(vaultId, address(token), 2_000e18);
        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 8_000e18);
    }

    function test_allocate_thenDeallocate_fullCycle() public {
        uint256 vaultId = _createVaultAndDeposit(10_000e18);

        vm.startPrank(issuer);
        // Allocate to two strategies
        vault.allocate(vaultId, address(token), STRAT_A, 4_000e18);
        vault.allocate(vaultId, address(token), STRAT_B, 3_000e18);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 3_000e18);

        // Deallocate fully from STRAT_A
        vault.deallocate(vaultId, address(token), STRAT_A, 4_000e18);
        assertEq(vault.getAllocation(vaultId, address(token), STRAT_A), 0);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 7_000e18);

        // Deallocate partially from STRAT_B
        vault.deallocate(vaultId, address(token), STRAT_B, 1_000e18);
        assertEq(vault.getAllocation(vaultId, address(token), STRAT_B), 2_000e18);
        assertEq(vault.getAvailableBalance(vaultId, address(token)), 8_000e18);
        vm.stopPrank();

        // Investor can now withdraw up to 8k
        vm.prank(investor);
        vault.withdraw(vaultId, address(token), 8_000e18);
        assertEq(vault.getDepositorBalance(vaultId, address(token), investor), 2_000e18);
    }
}
