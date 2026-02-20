// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title IHRC-755
/// @notice Interface for authorizing a contract to use the Hedera Schedule Service
/// @dev Must be called before using scheduleCall
interface IHRC755 {
    /// @notice Authorize the calling contract to create scheduled transactions
    /// @return responseCode Hedera response code (22 = SUCCESS)
    function authorizeSchedule() external returns (int64 responseCode);
}
