// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { InstiVaultAccessControl } from "../src/InstiVaultAccessControl.sol";
import { RWATokenFactory } from "../src/RWATokenFactory.sol";
import { RWAToken } from "../src/RWAToken.sol";

contract RWATokenFactoryTest is Test {
    InstiVaultAccessControl ac;
    RWATokenFactory factory;

    address admin = makeAddr("admin");
    address issuer = makeAddr("issuer");
    address investor = makeAddr("investor");
    address nobody = makeAddr("nobody");

    uint256 constant MATURITY = 1893456000; // 2030-01-01
    uint256 constant RATE = 500; // 5%
    uint256 constant INITIAL_SUPPLY = 1_000_000e18;

    function setUp() public {
        vm.startPrank(admin);
        ac = new InstiVaultAccessControl(admin);
        factory = new RWATokenFactory(address(ac));

        ac.grantRole(ac.ISSUER_ROLE(), issuer);
        ac.grantRole(ac.INVESTOR_ROLE(), investor);
        ac.addToWhitelist(issuer);
        ac.addToWhitelist(investor);
        vm.stopPrank();
    }

    function _defaultParams() internal pure returns (RWATokenFactory.TokenParams memory) {
        return RWATokenFactory.TokenParams({
            name: "French Gov Bond 2030",
            symbol: "FGB30",
            isin: "FR0000000001",
            rate: RATE,
            maturity: MATURITY,
            initialSupply: INITIAL_SUPPLY
        });
    }

    // ── Token creation ──

    function test_IssuerCanCreateToken() public {
        vm.prank(issuer);
        address token = factory.createToken(_defaultParams());

        assertTrue(token != address(0));
        assertEq(factory.getTokenCount(), 1);
        assertEq(factory.getTokenAt(0), token);
        assertTrue(factory.isRegistered(token));
        assertEq(factory.tokenByISIN("FR0000000001"), token);
    }

    function test_TokenMetadataIsCorrect() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());

        RWAToken token = RWAToken(tokenAddr);
        (string memory isin, uint256 rate, uint256 maturity, address tokenIssuer) = token.getMetadata();

        assertEq(isin, "FR0000000001");
        assertEq(rate, RATE);
        assertEq(maturity, MATURITY);
        assertEq(tokenIssuer, issuer);
        assertEq(token.name(), "French Gov Bond 2030");
        assertEq(token.symbol(), "FGB30");
    }

    function test_InitialSupplyMintedToIssuer() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());

        RWAToken token = RWAToken(tokenAddr);
        assertEq(token.balanceOf(issuer), INITIAL_SUPPLY);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }

    function test_NonIssuerCannotCreateToken() public {
        vm.prank(nobody);
        vm.expectRevert(RWATokenFactory.NotIssuer.selector);
        factory.createToken(_defaultParams());
    }

    function test_DuplicateISINReverts() public {
        vm.startPrank(issuer);
        factory.createToken(_defaultParams());

        vm.expectRevert(abi.encodeWithSelector(RWATokenFactory.ISINAlreadyExists.selector, "FR0000000001"));
        factory.createToken(_defaultParams());
        vm.stopPrank();
    }

    function test_MultipleTokensCreation() public {
        vm.startPrank(issuer);

        RWATokenFactory.TokenParams memory p1 = _defaultParams();
        factory.createToken(p1);

        RWATokenFactory.TokenParams memory p2 = RWATokenFactory.TokenParams({
            name: "US Treasury 2028",
            symbol: "UST28",
            isin: "US0000000001",
            rate: 300,
            maturity: 1861920000,
            initialSupply: 500_000e18
        });
        factory.createToken(p2);

        vm.stopPrank();

        assertEq(factory.getTokenCount(), 2);
        address[] memory all = factory.getAllTokens();
        assertEq(all.length, 2);
    }

    // ── Token creation event ──

    function test_TokenCreatedEventEmitted() public {
        vm.prank(issuer);
        vm.expectEmit(false, true, false, true);
        emit RWATokenFactory.TokenCreated(address(0), "FR0000000001", issuer, "French Gov Bond 2030", "FGB30");
        factory.createToken(_defaultParams());
    }

    // ── KYC transfer enforcement ──

    function test_WhitelistedTransferSucceeds() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());
        RWAToken token = RWAToken(tokenAddr);

        vm.prank(issuer);
        token.transfer(investor, 1000e18);

        assertEq(token.balanceOf(investor), 1000e18);
    }

    function test_TransferToNonWhitelistedReverts() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());
        RWAToken token = RWAToken(tokenAddr);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(RWAToken.TransferNotWhitelisted.selector, nobody));
        token.transfer(nobody, 1000e18);
    }

    function test_TransferFromNonWhitelistedReverts() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());
        RWAToken token = RWAToken(tokenAddr);

        // Issuer sends tokens to investor
        vm.prank(issuer);
        token.transfer(investor, 1000e18);

        // Remove investor from whitelist
        vm.prank(admin);
        ac.removeFromWhitelist(investor);

        // Investor tries to transfer — should fail
        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(RWAToken.TransferNotWhitelisted.selector, investor));
        token.transfer(issuer, 500e18);
    }

    // ── Mint access control ──

    function test_IssuerCanMintDirectly() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());
        RWAToken token = RWAToken(tokenAddr);

        vm.prank(issuer);
        token.mint(issuer, 5000e18);

        assertEq(token.balanceOf(issuer), INITIAL_SUPPLY + 5000e18);
    }

    function test_NobodyCannotMint() public {
        vm.prank(issuer);
        address tokenAddr = factory.createToken(_defaultParams());
        RWAToken token = RWAToken(tokenAddr);

        vm.prank(nobody);
        vm.expectRevert(RWAToken.OnlyFactoryOrIssuer.selector);
        token.mint(nobody, 1000e18);
    }

    // ── Zero initial supply ──

    function test_ZeroInitialSupply() public {
        RWATokenFactory.TokenParams memory p = _defaultParams();
        p.initialSupply = 0;
        p.isin = "FR0000000002";

        vm.prank(issuer);
        address tokenAddr = factory.createToken(p);

        RWAToken token = RWAToken(tokenAddr);
        assertEq(token.totalSupply(), 0);
        assertEq(token.balanceOf(issuer), 0);
    }

    // ── Fractionalization ──

    function _createDefaultToken() internal returns (address) {
        vm.prank(issuer);
        return factory.createToken(_defaultParams());
    }

    function test_fractionalize_success() public {
        address original = _createDefaultToken();

        vm.prank(issuer);
        address fractionAddr = factory.fractionalize(original, 100e18);

        assertTrue(fractionAddr != address(0));
        assertTrue(factory.isRegistered(fractionAddr));

        RWAToken fractionToken = RWAToken(fractionAddr);
        assertEq(fractionToken.totalSupply(), 100e18);
        assertEq(fractionToken.balanceOf(issuer), 100e18);
    }

    function test_fractionalize_metadataPreserved() public {
        address original = _createDefaultToken();

        vm.prank(issuer);
        address fractionAddr = factory.fractionalize(original, 100e18);

        RWAToken fractionToken = RWAToken(fractionAddr);
        (, uint256 rate, uint256 maturity, address fracIssuer) = fractionToken.getMetadata();

        assertEq(rate, RATE);
        assertEq(maturity, MATURITY);
        assertEq(fracIssuer, issuer);
    }

    function test_fractionalize_uniqueISIN() public {
        address original = _createDefaultToken();

        vm.startPrank(issuer);
        address frac1 = factory.fractionalize(original, 50e18);
        address frac2 = factory.fractionalize(original, 50e18);
        vm.stopPrank();

        RWAToken t1 = RWAToken(frac1);
        RWAToken t2 = RWAToken(frac2);
        (string memory isin1,,,) = t1.getMetadata();
        (string memory isin2,,,) = t2.getMetadata();

        assertTrue(keccak256(bytes(isin1)) != keccak256(bytes(isin2)));
    }

    function test_fractionalize_trackedInMapping() public {
        address original = _createDefaultToken();

        vm.startPrank(issuer);
        address frac1 = factory.fractionalize(original, 50e18);
        address frac2 = factory.fractionalize(original, 25e18);
        vm.stopPrank();

        address[] memory fracs = factory.getFractionalTokens(original);
        assertEq(fracs.length, 2);
        assertEq(fracs[0], frac1);
        assertEq(fracs[1], frac2);
    }

    function test_fractionalize_registeredInAllTokens() public {
        address original = _createDefaultToken();

        vm.prank(issuer);
        factory.fractionalize(original, 100e18);

        assertEq(factory.getTokenCount(), 2); // original + fraction
    }

    function test_fractionalize_emitsEvents() public {
        address original = _createDefaultToken();

        vm.prank(issuer);
        vm.expectEmit(true, false, false, false);
        emit RWATokenFactory.Fractionalized(original, address(0), 100e18);
        factory.fractionalize(original, 100e18);
    }

    function test_fractionalize_revertsNonIssuer() public {
        address original = _createDefaultToken();

        vm.prank(nobody);
        vm.expectRevert(RWATokenFactory.NotIssuer.selector);
        factory.fractionalize(original, 100e18);
    }

    function test_fractionalize_revertsUnregisteredToken() public {
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(RWATokenFactory.TokenNotRegistered.selector, address(0xdead)));
        factory.fractionalize(address(0xdead), 100e18);
    }

    function test_fractionalize_revertsZeroFractions() public {
        address original = _createDefaultToken();

        vm.prank(issuer);
        vm.expectRevert(RWATokenFactory.ZeroFractions.selector);
        factory.fractionalize(original, 0);
    }

    // ── Burn at maturity ──

    function test_burnAtMaturity_success() public {
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        // Issuer transfers to investor
        vm.prank(issuer);
        token.transfer(investor, 10_000e18);

        // Warp past maturity
        vm.warp(MATURITY + 1);

        vm.prank(investor);
        token.burnAtMaturity();

        assertEq(token.balanceOf(investor), 0);
        assertTrue(token.hasBurnedAtMaturity(investor));
    }

    function test_burnAtMaturity_revertsBeforeMaturity() public {
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        vm.warp(MATURITY - 1);

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(RWAToken.NotMatureYet.selector, MATURITY, MATURITY - 1)
        );
        token.burnAtMaturity();
    }

    function test_burnAtMaturity_revertsDoubleBurn() public {
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        vm.warp(MATURITY + 1);

        vm.startPrank(issuer);
        token.burnAtMaturity();

        vm.expectRevert(abi.encodeWithSelector(RWAToken.AlreadyBurnedAtMaturity.selector, issuer));
        token.burnAtMaturity();
        vm.stopPrank();
    }

    function test_burnAtMaturity_revertsZeroBalance() public {
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        vm.warp(MATURITY + 1);

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(RWAToken.NothingToBurn.selector, investor));
        token.burnAtMaturity();
    }

    function test_burnAtMaturity_multipleHolders() public {
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        vm.startPrank(issuer);
        token.transfer(investor, 10_000e18);
        vm.stopPrank();

        vm.warp(MATURITY + 1);

        // Issuer burns
        vm.prank(issuer);
        token.burnAtMaturity();
        assertEq(token.balanceOf(issuer), 0);

        // Investor burns
        vm.prank(investor);
        token.burnAtMaturity();
        assertEq(token.balanceOf(investor), 0);

        assertEq(token.totalSupply(), 0);
    }

    function test_burnAtMaturity_lifecycle() public {
        // mint → transfer → maturity → burn
        address tokenAddr = _createDefaultToken();
        RWAToken token = RWAToken(tokenAddr);

        // Issuer mints extra
        vm.prank(issuer);
        token.mint(issuer, 500_000e18);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + 500_000e18);

        // Transfer to investor
        vm.prank(issuer);
        token.transfer(investor, 200_000e18);
        assertEq(token.balanceOf(investor), 200_000e18);

        // Not mature yet — cannot burn
        vm.prank(investor);
        vm.expectRevert();
        token.burnAtMaturity();

        // Warp to maturity
        vm.warp(MATURITY);

        // Investor burns at maturity
        vm.prank(investor);
        token.burnAtMaturity();
        assertEq(token.balanceOf(investor), 0);
        assertTrue(token.hasBurnedAtMaturity(investor));

        // Issuer burns remaining
        vm.prank(issuer);
        token.burnAtMaturity();
        assertEq(token.totalSupply(), 0);
    }
}
