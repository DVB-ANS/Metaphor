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

    event TokenCreated(address indexed token, string isin, address indexed issuer, string name, string symbol);

    error NotIssuer();
    error ISINAlreadyExists(string isin);

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

    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokenAt(uint256 index) external view returns (address) {
        return allTokens[index];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
}
