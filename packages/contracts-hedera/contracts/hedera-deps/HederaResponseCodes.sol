// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

library HederaResponseCodes {
    int32 constant OK = 0;
    int32 constant SUCCESS = 22;
    int32 constant INVALID_SCHEDULE_ID = 201;
    int32 constant SCHEDULE_ALREADY_DELETED = 202;
    int32 constant SCHEDULE_ALREADY_EXECUTED = 203;
    int32 constant SCHEDULE_IS_IMMUTABLE = 210;
    int32 constant INVALID_TRANSACTION_BODY = 11;
    int32 constant INSUFFICIENT_PAYER_BALANCE = 10;
    int32 constant SCHEDULE_FUTURE_GAS_LIMIT_EXCEEDED = 423;
    int32 constant SCHEDULE_FUTURE_THROTTLE_EXCEEDED = 424;
}
