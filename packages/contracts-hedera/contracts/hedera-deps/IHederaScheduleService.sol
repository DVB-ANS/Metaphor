// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title IHederaScheduleService
/// @notice System contract interface for Hedera Schedule Service at address 0x16b
interface IHederaScheduleService {
    /// @notice Authorizes the calling contract to schedule transactions
    /// @return responseCode The response code (22 = SUCCESS)
    function authorizeSchedule() external returns (int64 responseCode);

    /// @notice Schedules a future contract call
    /// @param targetContract The contract to call
    /// @param expirationTime The unix timestamp when the call should execute
    /// @param gasLimit The gas limit for the scheduled call
    /// @param value The value to send with the call
    /// @param callData The encoded function call data
    /// @return responseCode The response code (22 = SUCCESS)
    /// @return scheduleAddress The address of the created schedule entity
    function scheduleCall(
        address targetContract,
        uint256 expirationTime,
        uint256 gasLimit,
        uint256 value,
        bytes calldata callData
    ) external returns (int64 responseCode, address scheduleAddress);

    /// @notice Checks if the contract has capacity for more scheduled calls
    /// @return hasCapacity Whether more schedules can be created
    function hasScheduleCapacity() external view returns (bool hasCapacity);
}
