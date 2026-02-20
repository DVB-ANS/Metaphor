// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { HederaScheduleService } from "./hedera-deps/HederaScheduleService.sol";

/// @title CouponScheduler
/// @notice Schedules and executes bond coupon payments via the Hedera Schedule Service
/// @dev Key bounty contract: scheduling is initiated FROM the smart contract via precompile 0x16b
contract CouponScheduler is Ownable, HederaScheduleService {
    using SafeERC20 for IERC20;

    // ─── Enums ───────────────────────────────────────────────────────────

    enum Frequency {
        Monthly, // 30 days
        Quarterly, // 90 days
        SemiAnnual, // 180 days
        Annual // 365 days
    }

    enum PaymentStatus {
        Pending,
        Scheduled,
        Executed,
        Failed,
        Suspended
    }

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Bond {
        uint256 id;
        address token; // RWA bond token (ERC-20)
        address paymentToken; // Token used for coupon payments (e.g. USDC)
        uint256 faceValue; // Face value in paymentToken decimals
        uint256 rate; // Annual rate in basis points (500 = 5%)
        Frequency frequency;
        uint256 startDate; // Unix timestamp
        uint256 maturityDate; // Unix timestamp
        address issuer;
        bool active;
    }

    struct ScheduledPayment {
        uint256 bondId;
        uint256 paymentDate;
        uint256 amount;
        PaymentStatus status;
        address scheduleAddress; // Hedera schedule entity address
    }

    // ─── State ───────────────────────────────────────────────────────────

    uint256 private _nextBondId;
    uint256 public constant SCHEDULE_GAS_LIMIT = 300_000;
    uint256 public constant BASIS_POINTS = 10_000;

    mapping(uint256 => Bond) private _bonds;
    // bondId => paymentDate => ScheduledPayment
    mapping(uint256 => mapping(uint256 => ScheduledPayment)) private _payments;
    // bondId => list of payment dates
    mapping(uint256 => uint256[]) private _paymentDates;

    // ─── Events ──────────────────────────────────────────────────────────

    event BondRegistered(
        uint256 indexed bondId, address indexed issuer, address token, uint256 rate, Frequency frequency
    );
    event CouponScheduled(uint256 indexed bondId, uint256 paymentDate, address scheduleAddress);
    event CouponExecuted(uint256 indexed bondId, uint256 paymentDate, uint256 amount);
    event PaymentSuspended(uint256 indexed bondId, uint256 paymentDate);
    event BondDeactivated(uint256 indexed bondId);

    // ─── Errors ──────────────────────────────────────────────────────────

    error BondNotFound(uint256 bondId);
    error BondNotActive(uint256 bondId);
    error InvalidDates(uint256 startDate, uint256 maturityDate);
    error InvalidRate();
    error InvalidFaceValue();
    error ZeroAddress();
    error PaymentNotFound(uint256 bondId, uint256 paymentDate);
    error PaymentNotPending(uint256 bondId, uint256 paymentDate);
    error PaymentAlreadyScheduled(uint256 bondId, uint256 paymentDate);
    error PaymentNotScheduled(uint256 bondId, uint256 paymentDate);
    error OnlyIssuerOrOwner();
    error NoPendingPayments(uint256 bondId);
    error PaymentDateInPast(uint256 paymentDate);
    error PaymentNotRecoverable(uint256 bondId, uint256 paymentDate);
    error InsufficientLiquidity(uint256 bondId, uint256 paymentDate, uint256 required, uint256 available);

    event PaymentFailed(uint256 indexed bondId, uint256 paymentDate, uint256 required, uint256 available);
    event PaymentRecovered(uint256 indexed bondId, uint256 paymentDate);

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier bondExists(uint256 bondId) {
        if (bondId >= _nextBondId) revert BondNotFound(bondId);
        _;
    }

    modifier bondActive(uint256 bondId) {
        if (!_bonds[bondId].active) revert BondNotActive(bondId);
        _;
    }

    modifier onlyIssuerOrOwner(uint256 bondId) {
        if (msg.sender != _bonds[bondId].issuer && msg.sender != owner()) {
            revert OnlyIssuerOrOwner();
        }
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address admin) Ownable(admin) { }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Authorize this contract with the Hedera Schedule Service
    /// @dev Must be called once before scheduling any coupons
    function authorize() external onlyOwner {
        _authorizeSchedule();
    }

    // ─── Bond Management ─────────────────────────────────────────────────

    /// @notice Register a new bond and compute its payment schedule
    /// @param token The RWA bond token address
    /// @param paymentToken Token used for coupon payments
    /// @param faceValue Face value of the bond
    /// @param rate Annual coupon rate in basis points
    /// @param frequency Payment frequency
    /// @param startDate Start date (unix timestamp)
    /// @param maturityDate Maturity date (unix timestamp)
    /// @param issuer Address of the bond issuer
    /// @return bondId The ID of the registered bond
    function registerBond(
        address token,
        address paymentToken,
        uint256 faceValue,
        uint256 rate,
        Frequency frequency,
        uint256 startDate,
        uint256 maturityDate,
        address issuer
    ) external onlyOwner returns (uint256 bondId) {
        if (token == address(0) || paymentToken == address(0) || issuer == address(0)) {
            revert ZeroAddress();
        }
        if (startDate >= maturityDate) revert InvalidDates(startDate, maturityDate);
        if (rate == 0 || rate > BASIS_POINTS) revert InvalidRate();
        if (faceValue == 0) revert InvalidFaceValue();

        bondId = _nextBondId++;
        _bonds[bondId] = Bond({
            id: bondId,
            token: token,
            paymentToken: paymentToken,
            faceValue: faceValue,
            rate: rate,
            frequency: frequency,
            startDate: startDate,
            maturityDate: maturityDate,
            issuer: issuer,
            active: true
        });

        _computePaymentDates(bondId);

        emit BondRegistered(bondId, issuer, token, rate, frequency);
    }

    // ─── Scheduling (BOUNTY CORE) ────────────────────────────────────────

    /// @notice Schedule a single coupon payment via Hedera Schedule Service
    /// @dev BOUNTY: calls scheduleCall directly on-chain via precompile 0x16b
    /// @param bondId The bond ID
    /// @param paymentDate The payment date to schedule
    function scheduleCoupon(uint256 bondId, uint256 paymentDate)
        external
        bondExists(bondId)
        bondActive(bondId)
        onlyIssuerOrOwner(bondId)
        onlyAuthorized
    {
        ScheduledPayment storage payment = _payments[bondId][paymentDate];
        if (payment.bondId == 0 && payment.paymentDate == 0) revert PaymentNotFound(bondId, paymentDate);
        if (payment.status != PaymentStatus.Pending) revert PaymentNotPending(bondId, paymentDate);
        if (paymentDate <= block.timestamp) revert PaymentDateInPast(paymentDate);

        // Encode the executeCoupon callback
        bytes memory callData = abi.encodeWithSelector(this.executeCoupon.selector, bondId, paymentDate);

        // Schedule via Hedera precompile — THIS IS THE BOUNTY REQUIREMENT
        address scheduleAddr = _scheduleCall(address(this), paymentDate, SCHEDULE_GAS_LIMIT, 0, callData);

        payment.status = PaymentStatus.Scheduled;
        payment.scheduleAddress = scheduleAddr;

        emit CouponScheduled(bondId, paymentDate, scheduleAddr);
    }

    /// @notice Schedule all pending coupon payments for a bond
    /// @param bondId The bond ID
    function scheduleAllCoupons(uint256 bondId)
        external
        bondExists(bondId)
        bondActive(bondId)
        onlyIssuerOrOwner(bondId)
        onlyAuthorized
    {
        uint256[] storage dates = _paymentDates[bondId];
        bool scheduled;

        for (uint256 i = 0; i < dates.length; i++) {
            ScheduledPayment storage payment = _payments[bondId][dates[i]];
            if (payment.status == PaymentStatus.Pending && dates[i] > block.timestamp) {
                bytes memory callData = abi.encodeWithSelector(this.executeCoupon.selector, bondId, dates[i]);
                address scheduleAddr = _scheduleCall(address(this), dates[i], SCHEDULE_GAS_LIMIT, 0, callData);

                payment.status = PaymentStatus.Scheduled;
                payment.scheduleAddress = scheduleAddr;
                scheduled = true;

                emit CouponScheduled(bondId, dates[i], scheduleAddr);
            }
        }

        if (!scheduled) revert NoPendingPayments(bondId);
    }

    // ─── Execution (Callback) ────────────────────────────────────────────

    /// @notice Execute a coupon payment — called by Hedera at the scheduled time
    /// @dev All-or-nothing: if insufficient liquidity, payment is marked Failed (no partial payments)
    /// @param bondId The bond ID
    /// @param paymentDate The payment date
    function executeCoupon(uint256 bondId, uint256 paymentDate) external bondExists(bondId) {
        ScheduledPayment storage payment = _payments[bondId][paymentDate];
        if (payment.bondId == 0 && payment.paymentDate == 0) revert PaymentNotFound(bondId, paymentDate);
        if (payment.status != PaymentStatus.Scheduled) revert PaymentNotScheduled(bondId, paymentDate);

        Bond storage bond = _bonds[bondId];

        // All-or-nothing: check liquidity before transfer
        uint256 available = IERC20(bond.paymentToken).balanceOf(address(this));
        if (available < payment.amount) {
            payment.status = PaymentStatus.Failed;
            emit PaymentFailed(bondId, paymentDate, payment.amount, available);
            return;
        }

        payment.status = PaymentStatus.Executed;

        // Transfer coupon payment from this contract to the issuer
        // (issuer then distributes via YieldDistributor)
        IERC20(bond.paymentToken).safeTransfer(bond.issuer, payment.amount);

        emit CouponExecuted(bondId, paymentDate, payment.amount);
    }

    // ─── Admin Controls ──────────────────────────────────────────────────

    /// @notice Suspend a pending or scheduled payment
    /// @param bondId The bond ID
    /// @param paymentDate The payment date to suspend
    function suspendPayment(uint256 bondId, uint256 paymentDate) external bondExists(bondId) onlyOwner {
        ScheduledPayment storage payment = _payments[bondId][paymentDate];
        if (payment.bondId == 0 && payment.paymentDate == 0) revert PaymentNotFound(bondId, paymentDate);
        if (payment.status != PaymentStatus.Pending && payment.status != PaymentStatus.Scheduled) {
            revert PaymentNotPending(bondId, paymentDate);
        }

        payment.status = PaymentStatus.Suspended;
        emit PaymentSuspended(bondId, paymentDate);
    }

    /// @notice Deactivate a bond (no more scheduling)
    /// @param bondId The bond ID
    function deactivateBond(uint256 bondId) external bondExists(bondId) onlyOwner {
        _bonds[bondId].active = false;
        emit BondDeactivated(bondId);
    }

    /// @notice Recover a failed or suspended payment by resetting it to Pending
    /// @dev After recovery, the payment can be re-scheduled via scheduleCoupon
    /// @param bondId The bond ID
    /// @param paymentDate The payment date to recover
    function recoverPayment(uint256 bondId, uint256 paymentDate)
        external
        bondExists(bondId)
        bondActive(bondId)
        onlyOwner
    {
        ScheduledPayment storage payment = _payments[bondId][paymentDate];
        if (payment.bondId == 0 && payment.paymentDate == 0) revert PaymentNotFound(bondId, paymentDate);
        if (payment.status != PaymentStatus.Failed && payment.status != PaymentStatus.Suspended) {
            revert PaymentNotRecoverable(bondId, paymentDate);
        }

        payment.status = PaymentStatus.Pending;
        payment.scheduleAddress = address(0);

        emit PaymentRecovered(bondId, paymentDate);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Get bond details
    function getBond(uint256 bondId) external view bondExists(bondId) returns (Bond memory) {
        return _bonds[bondId];
    }

    /// @notice Get all payment dates for a bond
    function getPaymentDates(uint256 bondId) external view bondExists(bondId) returns (uint256[] memory) {
        return _paymentDates[bondId];
    }

    /// @notice Get a specific scheduled payment
    function getPayment(uint256 bondId, uint256 paymentDate)
        external
        view
        bondExists(bondId)
        returns (ScheduledPayment memory)
    {
        return _payments[bondId][paymentDate];
    }

    /// @notice Get coupon amount per payment period
    function getCouponAmount(uint256 bondId) external view bondExists(bondId) returns (uint256) {
        return _calculateCouponAmount(bondId);
    }

    /// @notice Get the total number of registered bonds
    function bondCount() external view returns (uint256) {
        return _nextBondId;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /// @dev Compute and store all payment dates based on frequency
    function _computePaymentDates(uint256 bondId) internal {
        Bond storage bond = _bonds[bondId];
        uint256 interval = _frequencyToSeconds(bond.frequency);
        uint256 couponAmount = _calculateCouponAmount(bondId);

        uint256 date = bond.startDate + interval;
        while (date <= bond.maturityDate) {
            _paymentDates[bondId].push(date);
            _payments[bondId][date] = ScheduledPayment({
                bondId: bondId,
                paymentDate: date,
                amount: couponAmount,
                status: PaymentStatus.Pending,
                scheduleAddress: address(0)
            });
            date += interval;
        }
    }

    /// @dev Calculate coupon amount per period
    /// formula: (faceValue * rate) / (BASIS_POINTS * periodsPerYear)
    function _calculateCouponAmount(uint256 bondId) internal view returns (uint256) {
        Bond storage bond = _bonds[bondId];
        uint256 periodsPerYear = _periodsPerYear(bond.frequency);
        return (bond.faceValue * bond.rate) / (BASIS_POINTS * periodsPerYear);
    }

    /// @dev Convert frequency enum to seconds
    function _frequencyToSeconds(Frequency freq) internal pure returns (uint256) {
        if (freq == Frequency.Monthly) return 30 days;
        if (freq == Frequency.Quarterly) return 90 days;
        if (freq == Frequency.SemiAnnual) return 180 days;
        return 365 days; // Annual
    }

    /// @dev Get number of periods per year for a frequency
    function _periodsPerYear(Frequency freq) internal pure returns (uint256) {
        if (freq == Frequency.Monthly) return 12;
        if (freq == Frequency.Quarterly) return 4;
        if (freq == Frequency.SemiAnnual) return 2;
        return 1; // Annual
    }
}
