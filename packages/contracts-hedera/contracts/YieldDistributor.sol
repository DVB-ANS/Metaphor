// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title YieldDistributor
/// @notice Distributes yield pro-rata to bond token holders with snapshot-based accounting
contract YieldDistributor is Ownable {
    using SafeERC20 for IERC20;

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Snapshot {
        uint256 id;
        address token; // Bond token snapshotted
        address paymentToken; // Token used for yield payment
        uint256 totalYield; // Total yield to distribute
        uint256 totalSupply; // Total supply at snapshot time
        uint256 timestamp;
        uint256 claimedAmount; // Amount already claimed
        address[] holders; // Holders at snapshot time
    }

    struct HolderShare {
        uint256 balance; // Holder's token balance at snapshot
        uint256 yield; // Calculated pro-rata yield
        bool claimed; // Whether yield has been claimed
    }

    // ─── State ───────────────────────────────────────────────────────────

    uint256 private _nextSnapshotId;

    mapping(uint256 => Snapshot) private _snapshots;
    // snapshotId => holder => HolderShare
    mapping(uint256 => mapping(address => HolderShare)) private _holderShares;

    // ─── Events ──────────────────────────────────────────────────────────

    event YieldDistributed(
        uint256 indexed snapshotId,
        address indexed token,
        address indexed paymentToken,
        uint256 totalYield,
        uint256 holderCount
    );
    event YieldClaimed(uint256 indexed snapshotId, address indexed holder, uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error EmptyHolders();
    error ZeroTotalSupply();
    error SnapshotNotFound(uint256 snapshotId);
    error AlreadyClaimed(uint256 snapshotId, address holder);
    error NotAHolder(uint256 snapshotId, address holder);
    error NoYieldToClaim(address holder);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address admin) Ownable(admin) { }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Create a yield distribution snapshot
    /// @param token The bond token address
    /// @param paymentToken The payment token for yield
    /// @param totalYield Total yield amount to distribute
    /// @param holders Array of holder addresses (balances read on-chain)
    /// @return snapshotId The ID of the created snapshot
    function distribute(address token, address paymentToken, uint256 totalYield, address[] calldata holders)
        external
        onlyOwner
        returns (uint256 snapshotId)
    {
        if (token == address(0) || paymentToken == address(0)) revert ZeroAddress();
        if (totalYield == 0) revert ZeroAmount();
        if (holders.length == 0) revert EmptyHolders();

        // Calculate total supply from holders' balances
        uint256 totalSupply;
        uint256[] memory balances = new uint256[](holders.length);

        for (uint256 i = 0; i < holders.length; i++) {
            balances[i] = IERC20(token).balanceOf(holders[i]);
            totalSupply += balances[i];
        }

        if (totalSupply == 0) revert ZeroTotalSupply();

        // Transfer yield funds into this contract
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), totalYield);

        snapshotId = _nextSnapshotId++;
        _snapshots[snapshotId] = Snapshot({
            id: snapshotId,
            token: token,
            paymentToken: paymentToken,
            totalYield: totalYield,
            totalSupply: totalSupply,
            timestamp: block.timestamp,
            claimedAmount: 0,
            holders: holders
        });

        // Record each holder's share
        for (uint256 i = 0; i < holders.length; i++) {
            if (balances[i] > 0) {
                uint256 yieldShare = (balances[i] * totalYield) / totalSupply;
                _holderShares[snapshotId][holders[i]] =
                    HolderShare({ balance: balances[i], yield: yieldShare, claimed: false });
            }
        }

        emit YieldDistributed(snapshotId, token, paymentToken, totalYield, holders.length);
    }

    /// @notice Claim yield for a specific snapshot
    /// @param paymentToken The payment token to receive
    /// @param snapshotId The snapshot ID
    function claimYield(address paymentToken, uint256 snapshotId) external {
        _claimSingle(paymentToken, snapshotId, msg.sender);
    }

    /// @notice Claim yield for multiple snapshots at once
    /// @param paymentToken The payment token to receive
    /// @param snapshotIds Array of snapshot IDs to claim
    function claimAllYield(address paymentToken, uint256[] calldata snapshotIds) external {
        for (uint256 i = 0; i < snapshotIds.length; i++) {
            _claimSingle(paymentToken, snapshotIds[i], msg.sender);
        }
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Get total unclaimed yield across all snapshots for a holder
    /// @param holder The holder address
    /// @param paymentToken Filter by payment token
    /// @return total Total unclaimed yield
    function getUnclaimedYield(address holder, address paymentToken) external view returns (uint256 total) {
        uint256 end = _nextSnapshotId > 500 ? 500 : _nextSnapshotId;
        for (uint256 i = 0; i < end; i++) {
            Snapshot storage snap = _snapshots[i];
            if (snap.paymentToken == paymentToken) {
                HolderShare storage share = _holderShares[i][holder];
                if (share.balance > 0 && !share.claimed) {
                    total += share.yield;
                }
            }
        }
    }

    /// @notice Get unclaimed yield with pagination
    function getUnclaimedYieldPaginated(address holder, address paymentToken, uint256 offset, uint256 limit)
        external
        view
        returns (uint256 total, uint256 nextOffset)
    {
        uint256 end = offset + limit;
        if (end > _nextSnapshotId) end = _nextSnapshotId;
        for (uint256 i = offset; i < end; i++) {
            Snapshot storage snap = _snapshots[i];
            if (snap.paymentToken == paymentToken) {
                HolderShare storage share = _holderShares[i][holder];
                if (share.balance > 0 && !share.claimed) {
                    total += share.yield;
                }
            }
        }
        nextOffset = end < _nextSnapshotId ? end : 0;
    }

    /// @notice Get snapshot details
    /// @param snapshotId The snapshot ID
    function getSnapshotInfo(uint256 snapshotId)
        external
        view
        returns (
            address token,
            address paymentToken,
            uint256 totalYield,
            uint256 totalSupply,
            uint256 timestamp,
            uint256 claimedAmount,
            uint256 holderCount
        )
    {
        if (snapshotId >= _nextSnapshotId) revert SnapshotNotFound(snapshotId);
        Snapshot storage snap = _snapshots[snapshotId];
        return (
            snap.token,
            snap.paymentToken,
            snap.totalYield,
            snap.totalSupply,
            snap.timestamp,
            snap.claimedAmount,
            snap.holders.length
        );
    }

    /// @notice Get a holder's share for a snapshot
    /// @param snapshotId The snapshot ID
    /// @param holder The holder address
    function getHolderShare(uint256 snapshotId, address holder)
        external
        view
        returns (uint256 balance, uint256 yieldAmount, bool claimed)
    {
        if (snapshotId >= _nextSnapshotId) revert SnapshotNotFound(snapshotId);
        HolderShare storage share = _holderShares[snapshotId][holder];
        return (share.balance, share.yield, share.claimed);
    }

    /// @notice Get total number of snapshots
    function snapshotCount() external view returns (uint256) {
        return _nextSnapshotId;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    function _claimSingle(address paymentToken, uint256 snapshotId, address holder) internal {
        if (snapshotId >= _nextSnapshotId) revert SnapshotNotFound(snapshotId);

        Snapshot storage snap = _snapshots[snapshotId];
        require(snap.paymentToken == paymentToken, "Payment token mismatch");

        HolderShare storage share = _holderShares[snapshotId][holder];
        if (share.balance == 0) revert NotAHolder(snapshotId, holder);
        if (share.claimed) revert AlreadyClaimed(snapshotId, holder);

        share.claimed = true;
        snap.claimedAmount += share.yield;

        IERC20(paymentToken).safeTransfer(holder, share.yield);

        emit YieldClaimed(snapshotId, holder, share.yield);
    }
}
