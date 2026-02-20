// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { IHRC755 } from "./IHRC755.sol";
import { IHRC1215 } from "./IHRC1215.sol";
import { HederaResponseCodes } from "./HederaResponseCodes.sol";

/// @title HederaScheduleService
/// @notice Abstract base contract for interacting with the Hedera Schedule Service precompile (0x16b)
/// @dev Contracts that need to schedule future calls should inherit this
abstract contract HederaScheduleService {
    address constant SCHEDULE_PRECOMPILE = address(0x16b);

    bool private _authorized;

    error ScheduleAuthorizationFailed(int64 responseCode);
    error ScheduleCallFailed(int64 responseCode);
    error NotAuthorized();

    event ScheduleAuthorized(address indexed caller);
    event CallScheduled(address indexed scheduleAddress, address indexed target, uint256 expirationTime);

    modifier onlyAuthorized() {
        if (!_authorized) revert NotAuthorized();
        _;
    }

    /// @notice Authorize this contract to use the Schedule Service
    function _authorizeSchedule() internal {
        (bool success, bytes memory result) =
            SCHEDULE_PRECOMPILE.call(abi.encodeWithSelector(IHRC755.authorizeSchedule.selector));
        require(success, "authorizeSchedule call failed");

        int64 responseCode = abi.decode(result, (int64));
        if (responseCode != int64(int32(HederaResponseCodes.SUCCESS))) {
            revert ScheduleAuthorizationFailed(responseCode);
        }

        _authorized = true;
        emit ScheduleAuthorized(address(this));
    }

    /// @notice Schedule a future contract call via the precompile
    /// @param target The contract to call
    /// @param expirationTime Unix timestamp for execution
    /// @param gasLimit Gas limit for the call
    /// @param value HBAR to send
    /// @param callData Encoded function call
    /// @return scheduleAddress The address of the created schedule
    function _scheduleCall(
        address target,
        uint256 expirationTime,
        uint256 gasLimit,
        uint256 value,
        bytes memory callData
    ) internal returns (address scheduleAddress) {
        (bool success, bytes memory result) = SCHEDULE_PRECOMPILE.call(
            abi.encodeWithSelector(IHRC1215.scheduleCall.selector, target, expirationTime, gasLimit, value, callData)
        );
        require(success, "scheduleCall precompile call failed");

        int64 responseCode;
        (responseCode, scheduleAddress) = abi.decode(result, (int64, address));
        if (responseCode != int64(int32(HederaResponseCodes.SUCCESS))) {
            revert ScheduleCallFailed(responseCode);
        }

        emit CallScheduled(scheduleAddress, target, expirationTime);
    }

    /// @notice Check if the contract is authorized
    function isScheduleAuthorized() external view returns (bool) {
        return _authorized;
    }
}
