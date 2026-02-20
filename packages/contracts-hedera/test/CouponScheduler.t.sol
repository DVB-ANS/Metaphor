// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CouponScheduler } from "../contracts/CouponScheduler.sol";
import { HederaResponseCodes } from "../contracts/hedera-deps/HederaResponseCodes.sol";
import { IHRC755 } from "../contracts/hedera-deps/IHRC755.sol";
import { IHRC1215 } from "../contracts/hedera-deps/IHRC1215.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract CouponSchedulerTest is Test {
    CouponScheduler public scheduler;
    MockERC20 public bondToken;
    MockERC20 public paymentToken;

    address constant SCHEDULE_PRECOMPILE = address(0x16b);
    address public admin = makeAddr("admin");
    address public issuer = makeAddr("issuer");
    address public user = makeAddr("user");

    // Default bond params
    uint256 constant FACE_VALUE = 1_000_000e6; // 1M USDC
    uint256 constant RATE = 500; // 5% annual
    uint256 constant START_DATE = 1_700_000_000; // some future date
    uint256 constant MATURITY_DATE = START_DATE + 365 days;

    function setUp() public {
        vm.warp(START_DATE - 1 days);

        bondToken = new MockERC20("Bond Token", "BOND", 18);
        paymentToken = new MockERC20("USD Coin", "USDC", 6);

        vm.prank(admin);
        scheduler = new CouponScheduler(admin);

        // Mock the authorizeSchedule precompile call
        _mockAuthorize();

        vm.prank(admin);
        scheduler.authorize();

        // Fund scheduler with payment tokens for coupon execution
        paymentToken.mint(address(scheduler), 100_000_000e6);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _mockAuthorize() internal {
        vm.mockCall(
            SCHEDULE_PRECOMPILE,
            abi.encodeWithSelector(IHRC755.authorizeSchedule.selector),
            abi.encode(int64(int32(HederaResponseCodes.SUCCESS)))
        );
    }

    function _mockScheduleCall() internal {
        address fakeSchedule = makeAddr("schedule-entity");
        vm.mockCall(
            SCHEDULE_PRECOMPILE,
            abi.encodeWithSelector(IHRC1215.scheduleCall.selector),
            abi.encode(int64(int32(HederaResponseCodes.SUCCESS)), fakeSchedule)
        );
    }

    function _registerDefaultBond() internal returns (uint256) {
        vm.prank(admin);
        return scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    // ─── registerBond Tests ──────────────────────────────────────────────

    function test_registerBond_success() public {
        uint256 bondId = _registerDefaultBond();
        assertEq(bondId, 0);

        CouponScheduler.Bond memory bond = scheduler.getBond(bondId);
        assertEq(bond.token, address(bondToken));
        assertEq(bond.paymentToken, address(paymentToken));
        assertEq(bond.faceValue, FACE_VALUE);
        assertEq(bond.rate, RATE);
        assertEq(uint8(bond.frequency), uint8(CouponScheduler.Frequency.Quarterly));
        assertEq(bond.startDate, START_DATE);
        assertEq(bond.maturityDate, MATURITY_DATE);
        assertEq(bond.issuer, issuer);
        assertTrue(bond.active);
    }

    function test_registerBond_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit CouponScheduler.BondRegistered(0, issuer, address(bondToken), RATE, CouponScheduler.Frequency.Quarterly);

        _registerDefaultBond();
    }

    function test_registerBond_incrementsId() public {
        uint256 first = _registerDefaultBond();
        uint256 second = _registerDefaultBond();
        assertEq(first, 0);
        assertEq(second, 1);
        assertEq(scheduler.bondCount(), 2);
    }

    function test_registerBond_revertsZeroToken() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.ZeroAddress.selector);
        scheduler.registerBond(
            address(0),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    function test_registerBond_revertsZeroPaymentToken() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.ZeroAddress.selector);
        scheduler.registerBond(
            address(bondToken),
            address(0),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    function test_registerBond_revertsZeroIssuer() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.ZeroAddress.selector);
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            address(0)
        );
    }

    function test_registerBond_revertsInvalidDates() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.InvalidDates.selector, MATURITY_DATE, START_DATE));
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            MATURITY_DATE,
            START_DATE,
            issuer
        );
    }

    function test_registerBond_revertsZeroRate() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.InvalidRate.selector);
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            0,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    function test_registerBond_revertsRateOverBasisPoints() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.InvalidRate.selector);
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            10_001,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    function test_registerBond_revertsZeroFaceValue() public {
        vm.prank(admin);
        vm.expectRevert(CouponScheduler.InvalidFaceValue.selector);
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            0,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    function test_registerBond_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Quarterly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
    }

    // ─── Payment Dates Computation ───────────────────────────────────────

    function test_computePaymentDates_quarterly() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // 365 days / 90 days = 4 payments
        assertEq(dates.length, 4);
        assertEq(dates[0], START_DATE + 90 days);
        assertEq(dates[1], START_DATE + 180 days);
        assertEq(dates[2], START_DATE + 270 days);
        assertEq(dates[3], START_DATE + 360 days);
    }

    function test_computePaymentDates_monthly() public {
        vm.prank(admin);
        uint256 bondId = scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Monthly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // 365 days / 30 days = 12 payments
        assertEq(dates.length, 12);
        assertEq(dates[0], START_DATE + 30 days);
    }

    function test_computePaymentDates_semiAnnual() public {
        vm.prank(admin);
        uint256 bondId = scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.SemiAnnual,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // 365 days / 180 days = 2 payments
        assertEq(dates.length, 2);
        assertEq(dates[0], START_DATE + 180 days);
        assertEq(dates[1], START_DATE + 360 days);
    }

    function test_computePaymentDates_annual() public {
        vm.prank(admin);
        uint256 bondId = scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Annual,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // 365 days / 365 days = 1 payment
        assertEq(dates.length, 1);
        assertEq(dates[0], START_DATE + 365 days);
    }

    // ─── Coupon Amount Calculation ───────────────────────────────────────

    function test_couponAmount_quarterly() public {
        uint256 bondId = _registerDefaultBond();
        uint256 amount = scheduler.getCouponAmount(bondId);

        // (1_000_000e6 * 500) / (10_000 * 4) = 12_500e6
        assertEq(amount, 12_500e6);
    }

    function test_couponAmount_monthly() public {
        vm.prank(admin);
        uint256 bondId = scheduler.registerBond(
            address(bondToken),
            address(paymentToken),
            FACE_VALUE,
            RATE,
            CouponScheduler.Frequency.Monthly,
            START_DATE,
            MATURITY_DATE,
            issuer
        );
        uint256 amount = scheduler.getCouponAmount(bondId);

        // (1_000_000e6 * 500) / (10_000 * 12) = 4_166_666_666 (truncated)
        assertEq(amount, 4_166_666_666);
    }

    // ─── scheduleCoupon Tests ────────────────────────────────────────────

    function test_scheduleCoupon_success() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Scheduled));
        assertNotEq(payment.scheduleAddress, address(0));
    }

    function test_scheduleCoupon_emitsEvent() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.expectEmit(true, false, false, true);
        emit CouponScheduler.CouponScheduled(bondId, dates[0], makeAddr("schedule-entity"));

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);
    }

    function test_scheduleCoupon_revertsNonExistentBond() public {
        _mockScheduleCall();

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.BondNotFound.selector, 999));
        scheduler.scheduleCoupon(999, START_DATE + 90 days);
    }

    function test_scheduleCoupon_revertsInactiveBond() public {
        uint256 bondId = _registerDefaultBond();

        vm.prank(admin);
        scheduler.deactivateBond(bondId);

        _mockScheduleCall();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.BondNotActive.selector, bondId));
        scheduler.scheduleCoupon(bondId, dates[0]);
    }

    function test_scheduleCoupon_revertsUnauthorizedCaller() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(user);
        vm.expectRevert(CouponScheduler.OnlyIssuerOrOwner.selector);
        scheduler.scheduleCoupon(bondId, dates[0]);
    }

    function test_scheduleCoupon_revertsPaymentNotFound() public {
        uint256 bondId = _registerDefaultBond();
        _mockScheduleCall();

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.PaymentNotFound.selector, bondId, 12345));
        scheduler.scheduleCoupon(bondId, 12345);
    }

    function test_scheduleCoupon_revertsAlreadyScheduled() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.PaymentNotPending.selector, bondId, dates[0]));
        scheduler.scheduleCoupon(bondId, dates[0]);
    }

    function test_scheduleCoupon_revertsPaymentDateInPast() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // Warp past the first payment date
        vm.warp(dates[0] + 1);
        _mockScheduleCall();

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.PaymentDateInPast.selector, dates[0]));
        scheduler.scheduleCoupon(bondId, dates[0]);
    }

    // ─── scheduleAllCoupons Tests ────────────────────────────────────────

    function test_scheduleAllCoupons_success() public {
        uint256 bondId = _registerDefaultBond();
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleAllCoupons(bondId);

        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        for (uint256 i = 0; i < dates.length; i++) {
            CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[i]);
            assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Scheduled));
        }
    }

    function test_scheduleAllCoupons_revertsNoPending() public {
        uint256 bondId = _registerDefaultBond();
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleAllCoupons(bondId);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.NoPendingPayments.selector, bondId));
        scheduler.scheduleAllCoupons(bondId);
    }

    // ─── executeCoupon Tests ─────────────────────────────────────────────

    function test_executeCoupon_success() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        uint256 balanceBefore = paymentToken.balanceOf(issuer);
        uint256 couponAmount = scheduler.getCouponAmount(bondId);

        // Simulate Hedera executing the callback (self-call)
        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);

        uint256 balanceAfter = paymentToken.balanceOf(issuer);
        assertEq(balanceAfter - balanceBefore, couponAmount);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Executed));
    }

    function test_executeCoupon_emitsEvent() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        uint256 couponAmount = scheduler.getCouponAmount(bondId);

        vm.expectEmit(true, false, false, true);
        emit CouponScheduler.CouponExecuted(bondId, dates[0], couponAmount);

        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);
    }

    function test_executeCoupon_revertsUnauthorizedExecutor() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        vm.warp(dates[0]);
        vm.prank(user);
        vm.expectRevert(CouponScheduler.UnauthorizedExecutor.selector);
        scheduler.executeCoupon(bondId, dates[0]);
    }

    function test_executeCoupon_revertsIfNotScheduled() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(address(scheduler));
        vm.expectRevert(abi.encodeWithSelector(CouponScheduler.PaymentNotScheduled.selector, bondId, dates[0]));
        scheduler.executeCoupon(bondId, dates[0]);
    }

    // ─── suspendPayment Tests ────────────────────────────────────────────

    function test_suspendPayment_pending() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Suspended));
    }

    function test_suspendPayment_scheduled() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Suspended));
    }

    function test_suspendPayment_emitsEvent() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.expectEmit(true, false, false, true);
        emit CouponScheduler.PaymentSuspended(bondId, dates[0]);

        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);
    }

    function test_suspendPayment_onlyOwner() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(user);
        vm.expectRevert();
        scheduler.suspendPayment(bondId, dates[0]);
    }

    // ─── deactivateBond Tests ────────────────────────────────────────────

    function test_deactivateBond_success() public {
        uint256 bondId = _registerDefaultBond();

        vm.prank(admin);
        scheduler.deactivateBond(bondId);

        CouponScheduler.Bond memory bond = scheduler.getBond(bondId);
        assertFalse(bond.active);
    }

    function test_deactivateBond_emitsEvent() public {
        uint256 bondId = _registerDefaultBond();

        vm.expectEmit(true, false, false, false);
        emit CouponScheduler.BondDeactivated(bondId);

        vm.prank(admin);
        scheduler.deactivateBond(bondId);
    }

    function test_deactivateBond_onlyOwner() public {
        uint256 bondId = _registerDefaultBond();

        vm.prank(user);
        vm.expectRevert();
        scheduler.deactivateBond(bondId);
    }

    // ─── Authorization Tests ─────────────────────────────────────────────

    function test_authorize_setsFlag() public {
        assertTrue(scheduler.isScheduleAuthorized());
    }

    function test_authorize_onlyOwner() public {
        CouponScheduler newScheduler = new CouponScheduler(admin);
        _mockAuthorize();

        vm.prank(user);
        vm.expectRevert();
        newScheduler.authorize();
    }

    // ─── Edge Case: Insufficient Liquidity (All-or-Nothing) ───────────

    function test_executeCoupon_failsOnInsufficientLiquidity() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        // Drain the scheduler's payment tokens
        uint256 schedulerBalance = paymentToken.balanceOf(address(scheduler));
        vm.prank(address(scheduler));
        paymentToken.transfer(admin, schedulerBalance);

        // Execute should mark as Failed, not revert
        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Failed));
    }

    function test_executeCoupon_emitsPaymentFailedOnInsufficientLiquidity() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        // Drain funds
        uint256 schedulerBalance = paymentToken.balanceOf(address(scheduler));
        vm.prank(address(scheduler));
        paymentToken.transfer(admin, schedulerBalance);

        uint256 couponAmount = scheduler.getCouponAmount(bondId);

        vm.warp(dates[0]);
        vm.expectEmit(true, false, false, true);
        emit CouponScheduler.PaymentFailed(bondId, dates[0], couponAmount, 0);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);
    }

    function test_executeCoupon_noPartialPayment() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        // Leave only half the required amount
        uint256 couponAmount = scheduler.getCouponAmount(bondId);
        uint256 schedulerBalance = paymentToken.balanceOf(address(scheduler));
        vm.prank(address(scheduler));
        paymentToken.transfer(admin, schedulerBalance - couponAmount / 2);

        // Should mark as Failed, issuer gets nothing (all-or-nothing)
        uint256 issuerBefore = paymentToken.balanceOf(issuer);
        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);

        assertEq(paymentToken.balanceOf(issuer), issuerBefore); // No partial transfer
        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Failed));
    }

    // ─── Edge Case: Missed Payment Recovery ───────────────────────────

    function test_recoverPayment_fromFailed() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        // Drain funds and execute (will fail)
        uint256 schedulerBalance = paymentToken.balanceOf(address(scheduler));
        vm.prank(address(scheduler));
        paymentToken.transfer(admin, schedulerBalance);
        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);

        // Recover the payment
        vm.prank(admin);
        scheduler.recoverPayment(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Pending));
        assertEq(payment.scheduleAddress, address(0));
    }

    function test_recoverPayment_fromSuspended() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // Suspend a payment
        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);

        // Recover it
        vm.prank(admin);
        scheduler.recoverPayment(bondId, dates[0]);

        CouponScheduler.ScheduledPayment memory payment = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(payment.status), uint8(CouponScheduler.PaymentStatus.Pending));
    }

    function test_recoverPayment_emitsEvent() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);

        vm.expectEmit(true, false, false, true);
        emit CouponScheduler.PaymentRecovered(bondId, dates[0]);

        vm.prank(admin);
        scheduler.recoverPayment(bondId, dates[0]);
    }

    function test_recoverPayment_revertsIfNotRecoverable() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        // Payment is Pending — not recoverable
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(CouponScheduler.PaymentNotRecoverable.selector, bondId, dates[0])
        );
        scheduler.recoverPayment(bondId, dates[0]);
    }

    function test_recoverPayment_revertsIfExecuted() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);

        // Cannot recover an already executed payment
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(CouponScheduler.PaymentNotRecoverable.selector, bondId, dates[0])
        );
        scheduler.recoverPayment(bondId, dates[0]);
    }

    function test_recoverPayment_onlyOwner() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);

        vm.prank(admin);
        scheduler.suspendPayment(bondId, dates[0]);

        vm.prank(user);
        vm.expectRevert();
        scheduler.recoverPayment(bondId, dates[0]);
    }

    function test_recoverPayment_fullCycle_failRecoverRescheduleExecute() public {
        uint256 bondId = _registerDefaultBond();
        uint256[] memory dates = scheduler.getPaymentDates(bondId);
        _mockScheduleCall();

        // Schedule and drain funds
        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[0]);

        uint256 schedulerBalance = paymentToken.balanceOf(address(scheduler));
        vm.prank(address(scheduler));
        paymentToken.transfer(admin, schedulerBalance);

        // Execute fails
        vm.warp(dates[0]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[0]);
        CouponScheduler.ScheduledPayment memory p1 = scheduler.getPayment(bondId, dates[0]);
        assertEq(uint8(p1.status), uint8(CouponScheduler.PaymentStatus.Failed));

        // Recover
        vm.prank(admin);
        scheduler.recoverPayment(bondId, dates[0]);

        // Re-fund the scheduler
        paymentToken.mint(address(scheduler), 100_000_000e6);

        // Re-schedule (needs future date, so use dates[1] for a different payment)
        // For the recovered one, date is in the past. Let's test with dates[1] instead.
        // Schedule dates[1], execute it successfully
        vm.prank(issuer);
        scheduler.scheduleCoupon(bondId, dates[1]);

        uint256 issuerBefore = paymentToken.balanceOf(issuer);
        uint256 couponAmount = scheduler.getCouponAmount(bondId);

        vm.warp(dates[1]);
        vm.prank(address(scheduler));
        scheduler.executeCoupon(bondId, dates[1]);

        assertEq(paymentToken.balanceOf(issuer) - issuerBefore, couponAmount);
        CouponScheduler.ScheduledPayment memory p2 = scheduler.getPayment(bondId, dates[1]);
        assertEq(uint8(p2.status), uint8(CouponScheduler.PaymentStatus.Executed));
    }
}
