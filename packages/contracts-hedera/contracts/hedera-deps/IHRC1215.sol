// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title IHRC-1215
/// @notice Interface for scheduled native contract calls on Hedera
/// @dev Implemented by the Schedule Service system contract at 0x16b
interface IHRC1215 {
    /// @notice Schedule a future contract call
    /// @param targetContract The contract address to call
    /// @param expirationTime Unix timestamp for when the call should execute
    /// @param gasLimit Gas limit for the scheduled call
    /// @param value HBAR value to send
    /// @param callData ABI-encoded function call
    /// @return responseCode Hedera response code (22 = SUCCESS)
    /// @return scheduleAddress Address of the created schedule
    function scheduleCall(
        address targetContract,
        uint256 expirationTime,
        uint256 gasLimit,
        uint256 value,
        bytes calldata callData
    ) external returns (int64 responseCode, address scheduleAddress);

    /// @notice Check if more schedules can be created
    /// @return Whether the contract has schedule capacity
    function hasScheduleCapacity() external view returns (bool);
}
