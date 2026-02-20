// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { YieldDistributor } from "../contracts/YieldDistributor.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract YieldDistributorTest is Test {
    YieldDistributor public distributor;
    MockERC20 public bondToken;
    MockERC20 public paymentToken;

    address public admin = makeAddr("admin");
    address public holder1 = makeAddr("holder1");
    address public holder2 = makeAddr("holder2");
    address public holder3 = makeAddr("holder3");
    address public nonHolder = makeAddr("nonHolder");

    uint256 constant TOTAL_YIELD = 50_000e6; // 50k USDC

    function setUp() public {
        bondToken = new MockERC20("Bond Token", "BOND", 18);
        paymentToken = new MockERC20("USD Coin", "USDC", 6);

        vm.prank(admin);
        distributor = new YieldDistributor(admin);

        // Setup holder balances: holder1=500, holder2=300, holder3=200 (total=1000)
        bondToken.mint(holder1, 500e18);
        bondToken.mint(holder2, 300e18);
        bondToken.mint(holder3, 200e18);

        // Fund admin with payment tokens
        paymentToken.mint(admin, 1_000_000e6);

        // Approve distributor to pull payment tokens
        vm.prank(admin);
        paymentToken.approve(address(distributor), type(uint256).max);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _defaultHolders() internal view returns (address[] memory) {
        address[] memory holders = new address[](3);
        holders[0] = holder1;
        holders[1] = holder2;
        holders[2] = holder3;
        return holders;
    }

    function _distribute() internal returns (uint256) {
        vm.prank(admin);
        return distributor.distribute(address(bondToken), address(paymentToken), TOTAL_YIELD, _defaultHolders());
    }

    // ─── distribute Tests ────────────────────────────────────────────────

    function test_distribute_success() public {
        uint256 snapshotId = _distribute();
        assertEq(snapshotId, 0);

        (
            address token,
            address pymtToken,
            uint256 totalYield,
            uint256 totalSupply,
            uint256 timestamp,
            uint256 claimedAmount,
            uint256 holderCount
        ) = distributor.getSnapshotInfo(snapshotId);

        assertEq(token, address(bondToken));
        assertEq(pymtToken, address(paymentToken));
        assertEq(totalYield, TOTAL_YIELD);
        assertEq(totalSupply, 1000e18);
        assertEq(timestamp, block.timestamp);
        assertEq(claimedAmount, 0);
        assertEq(holderCount, 3);
    }

    function test_distribute_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit YieldDistributor.YieldDistributed(0, address(bondToken), address(paymentToken), TOTAL_YIELD, 3);

        _distribute();
    }

    function test_distribute_transfersFunds() public {
        uint256 balanceBefore = paymentToken.balanceOf(address(distributor));
        _distribute();
        uint256 balanceAfter = paymentToken.balanceOf(address(distributor));

        assertEq(balanceAfter - balanceBefore, TOTAL_YIELD);
    }

    function test_distribute_incrementsSnapshotId() public {
        uint256 first = _distribute();
        uint256 second = _distribute();
        assertEq(first, 0);
        assertEq(second, 1);
        assertEq(distributor.snapshotCount(), 2);
    }

    function test_distribute_revertsZeroToken() public {
        vm.prank(admin);
        vm.expectRevert(YieldDistributor.ZeroAddress.selector);
        distributor.distribute(address(0), address(paymentToken), TOTAL_YIELD, _defaultHolders());
    }

    function test_distribute_revertsZeroPaymentToken() public {
        vm.prank(admin);
        vm.expectRevert(YieldDistributor.ZeroAddress.selector);
        distributor.distribute(address(bondToken), address(0), TOTAL_YIELD, _defaultHolders());
    }

    function test_distribute_revertsZeroAmount() public {
        vm.prank(admin);
        vm.expectRevert(YieldDistributor.ZeroAmount.selector);
        distributor.distribute(address(bondToken), address(paymentToken), 0, _defaultHolders());
    }

    function test_distribute_revertsEmptyHolders() public {
        address[] memory empty = new address[](0);

        vm.prank(admin);
        vm.expectRevert(YieldDistributor.EmptyHolders.selector);
        distributor.distribute(address(bondToken), address(paymentToken), TOTAL_YIELD, empty);
    }

    function test_distribute_revertsZeroTotalSupply() public {
        // Create holders with zero balance
        address[] memory holders = new address[](1);
        holders[0] = makeAddr("zeroBalance");

        vm.prank(admin);
        vm.expectRevert(YieldDistributor.ZeroTotalSupply.selector);
        distributor.distribute(address(bondToken), address(paymentToken), TOTAL_YIELD, holders);
    }

    function test_distribute_onlyOwner() public {
        vm.prank(holder1);
        vm.expectRevert();
        distributor.distribute(address(bondToken), address(paymentToken), TOTAL_YIELD, _defaultHolders());
    }

    // ─── Pro-rata Calculation ────────────────────────────────────────────

    function test_proRata_correctShares() public {
        uint256 snapshotId = _distribute();

        // holder1: 500/1000 * 50_000 = 25_000
        (uint256 bal1, uint256 yield1, bool claimed1) = distributor.getHolderShare(snapshotId, holder1);
        assertEq(bal1, 500e18);
        assertEq(yield1, 25_000e6);
        assertFalse(claimed1);

        // holder2: 300/1000 * 50_000 = 15_000
        (uint256 bal2, uint256 yield2, bool claimed2) = distributor.getHolderShare(snapshotId, holder2);
        assertEq(bal2, 300e18);
        assertEq(yield2, 15_000e6);
        assertFalse(claimed2);

        // holder3: 200/1000 * 50_000 = 10_000
        (uint256 bal3, uint256 yield3, bool claimed3) = distributor.getHolderShare(snapshotId, holder3);
        assertEq(bal3, 200e18);
        assertEq(yield3, 10_000e6);
        assertFalse(claimed3);
    }

    function test_proRata_unevenDistribution() public {
        // 3 equal holders, yield not perfectly divisible
        MockERC20 token2 = new MockERC20("Token2", "T2", 18);
        token2.mint(holder1, 1e18);
        token2.mint(holder2, 1e18);
        token2.mint(holder3, 1e18);

        address[] memory holders = _defaultHolders();
        uint256 yield_ = 10e6; // 10 USDC, split 3 ways = 3.333... each

        vm.prank(admin);
        uint256 snapshotId = distributor.distribute(address(token2), address(paymentToken), yield_, holders);

        (, uint256 y1,) = distributor.getHolderShare(snapshotId, holder1);
        (, uint256 y2,) = distributor.getHolderShare(snapshotId, holder2);
        (, uint256 y3,) = distributor.getHolderShare(snapshotId, holder3);

        // Each gets 3_333_333 (truncated), total = 9_999_999, dust stays in contract
        assertEq(y1, 3_333_333);
        assertEq(y2, 3_333_333);
        assertEq(y3, 3_333_333);
    }

    // ─── claimYield Tests ────────────────────────────────────────────────

    function test_claimYield_success() public {
        uint256 snapshotId = _distribute();

        uint256 balanceBefore = paymentToken.balanceOf(holder1);

        vm.prank(holder1);
        distributor.claimYield(address(paymentToken), snapshotId);

        uint256 balanceAfter = paymentToken.balanceOf(holder1);
        assertEq(balanceAfter - balanceBefore, 25_000e6);

        (,, bool claimed) = distributor.getHolderShare(snapshotId, holder1);
        assertTrue(claimed);
    }

    function test_claimYield_emitsEvent() public {
        uint256 snapshotId = _distribute();

        vm.expectEmit(true, true, false, true);
        emit YieldDistributor.YieldClaimed(snapshotId, holder1, 25_000e6);

        vm.prank(holder1);
        distributor.claimYield(address(paymentToken), snapshotId);
    }

    function test_claimYield_updatesClaimedAmount() public {
        uint256 snapshotId = _distribute();

        vm.prank(holder1);
        distributor.claimYield(address(paymentToken), snapshotId);

        (,,,,, uint256 claimedAmount,) = distributor.getSnapshotInfo(snapshotId);
        assertEq(claimedAmount, 25_000e6);
    }

    function test_claimYield_revertsDoubleClaim() public {
        uint256 snapshotId = _distribute();

        vm.prank(holder1);
        distributor.claimYield(address(paymentToken), snapshotId);

        vm.prank(holder1);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.AlreadyClaimed.selector, snapshotId, holder1));
        distributor.claimYield(address(paymentToken), snapshotId);
    }

    function test_claimYield_revertsNotHolder() public {
        uint256 snapshotId = _distribute();

        vm.prank(nonHolder);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.NotAHolder.selector, snapshotId, nonHolder));
        distributor.claimYield(address(paymentToken), snapshotId);
    }

    function test_claimYield_revertsInvalidSnapshot() public {
        vm.prank(holder1);
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.SnapshotNotFound.selector, 999));
        distributor.claimYield(address(paymentToken), 999);
    }

    // ─── claimAllYield Tests ─────────────────────────────────────────────

    function test_claimAllYield_multipleSnapshots() public {
        uint256 snap1 = _distribute();
        uint256 snap2 = _distribute();

        uint256[] memory ids = new uint256[](2);
        ids[0] = snap1;
        ids[1] = snap2;

        uint256 balanceBefore = paymentToken.balanceOf(holder1);

        vm.prank(holder1);
        distributor.claimAllYield(address(paymentToken), ids);

        uint256 balanceAfter = paymentToken.balanceOf(holder1);
        assertEq(balanceAfter - balanceBefore, 50_000e6); // 25k * 2
    }

    // ─── getUnclaimedYield Tests ─────────────────────────────────────────

    function test_getUnclaimedYield_allUnclaimed() public {
        _distribute();
        _distribute();

        uint256 unclaimed = distributor.getUnclaimedYield(holder1, address(paymentToken));
        assertEq(unclaimed, 50_000e6); // 25k * 2
    }

    function test_getUnclaimedYield_afterPartialClaim() public {
        uint256 snap1 = _distribute();
        _distribute();

        vm.prank(holder1);
        distributor.claimYield(address(paymentToken), snap1);

        uint256 unclaimed = distributor.getUnclaimedYield(holder1, address(paymentToken));
        assertEq(unclaimed, 25_000e6);
    }

    function test_getUnclaimedYield_zeroForNonHolder() public {
        _distribute();

        uint256 unclaimed = distributor.getUnclaimedYield(nonHolder, address(paymentToken));
        assertEq(unclaimed, 0);
    }

    // ─── View Tests ──────────────────────────────────────────────────────

    function test_snapshotNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.SnapshotNotFound.selector, 0));
        distributor.getSnapshotInfo(0);
    }

    function test_holderShare_snapshotNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(YieldDistributor.SnapshotNotFound.selector, 0));
        distributor.getHolderShare(0, holder1);
    }
}
