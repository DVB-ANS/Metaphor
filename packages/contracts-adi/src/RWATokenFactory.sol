// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { InstiVaultAccessControl } from "./InstiVaultAccessControl.sol";
import { RWAToken } from "./RWAToken.sol";

contract RWATokenFactory {
    struct TokenParams {
        string name;
        string symbol;
        string isin;
        uint256 rate; // basis points
        uint256 maturity; // unix timestamp
        uint256 initialSupply;
    }

    InstiVaultAccessControl public accessControl;

    address[] public allTokens;
    mapping(address => bool) public isRegistered;
    mapping(string => address) public tokenByISIN;
    mapping(address => address[]) public fractionalizedTokens;

    event TokenCreated(address indexed token, string isin, address indexed issuer, string name, string symbol);
    event Fractionalized(address indexed originalToken, address indexed fractionToken, uint256 fractions);

    error NotIssuer();
    error ISINAlreadyExists(string isin);
    error TokenNotRegistered(address token);
    error ZeroFractions();

    constructor(address accessControl_) {
        accessControl = InstiVaultAccessControl(accessControl_);
    }

    function createToken(TokenParams calldata params) external returns (address) {
        if (!accessControl.hasRole(accessControl.ISSUER_ROLE(), msg.sender)) {
            revert NotIssuer();
        }
        if (tokenByISIN[params.isin] != address(0)) {
            revert ISINAlreadyExists(params.isin);
        }

        RWAToken token = new RWAToken(
            RWAToken.ConstructorParams({
                name: params.name,
                symbol: params.symbol,
                isin: params.isin,
                rate: params.rate,
                maturity: params.maturity,
                issuer: msg.sender,
                initialSupply: params.initialSupply,
                accessControl: address(accessControl),
                factory: address(this)
            })
        );

        address tokenAddr = address(token);
        allTokens.push(tokenAddr);
        isRegistered[tokenAddr] = true;
        tokenByISIN[params.isin] = tokenAddr;

        emit TokenCreated(tokenAddr, params.isin, msg.sender, params.name, params.symbol);

        return tokenAddr;
    }

    function fractionalize(address originalToken, uint256 fractions) external returns (address) {
        if (!accessControl.hasRole(accessControl.ISSUER_ROLE(), msg.sender)) {
            revert NotIssuer();
        }
        if (!isRegistered[originalToken]) {
            revert TokenNotRegistered(originalToken);
        }
        if (fractions == 0) {
            revert ZeroFractions();
        }

        RWAToken original = RWAToken(originalToken);
        (string memory isin, uint256 rate, uint256 maturity,) = original.getMetadata();

        uint256 fractionIndex = fractionalizedTokens[originalToken].length + 1;
        string memory fracISIN = string.concat(isin, "-FRAC-", _uint2str(fractionIndex));

        RWAToken fractionToken = new RWAToken(
            RWAToken.ConstructorParams({
                name: string.concat(original.name(), " Fraction"),
                symbol: string.concat(original.symbol(), "F"),
                isin: fracISIN,
                rate: rate,
                maturity: maturity,
                issuer: msg.sender,
                initialSupply: fractions,
                accessControl: address(accessControl),
                factory: address(this)
            })
        );

        address fractionAddr = address(fractionToken);
        allTokens.push(fractionAddr);
        isRegistered[fractionAddr] = true;
        tokenByISIN[fracISIN] = fractionAddr;
        fractionalizedTokens[originalToken].push(fractionAddr);

        emit TokenCreated(fractionAddr, fracISIN, msg.sender, original.name(), original.symbol());
        emit Fractionalized(originalToken, fractionAddr, fractions);

        return fractionAddr;
    }

    function getFractionalTokens(address originalToken) external view returns (address[] memory) {
        return fractionalizedTokens[originalToken];
    }

    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokenAt(uint256 index) external view returns (address) {
        return allTokens[index];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
