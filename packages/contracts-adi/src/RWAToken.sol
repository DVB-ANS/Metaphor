// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { InstiVaultAccessControl } from "./InstiVaultAccessControl.sol";

contract RWAToken is ERC20, ERC20Burnable {
    struct AssetMetadata {
        string isin;
        uint256 rate; // basis points (500 = 5%)
        uint256 maturity; // unix timestamp
        address issuer;
    }

    struct ConstructorParams {
        string name;
        string symbol;
        string isin;
        uint256 rate;
        uint256 maturity;
        address issuer;
        uint256 initialSupply;
        address accessControl;
        address factory;
    }

    AssetMetadata public metadata;
    InstiVaultAccessControl public accessControl;
    address public factory;

    error OnlyFactoryOrIssuer();
    error TransferNotWhitelisted(address account);
    error NotMatureYet(uint256 maturityDate, uint256 currentTime);
    error AlreadyBurnedAtMaturity(address holder);
    error NothingToBurn(address holder);

    mapping(address => bool) private _hasBurnedAtMaturity;

    modifier onlyFactoryOrIssuer() {
        if (msg.sender != factory && msg.sender != metadata.issuer) {
            revert OnlyFactoryOrIssuer();
        }
        _;
    }

    constructor(ConstructorParams memory p) ERC20(p.name, p.symbol) {
        metadata = AssetMetadata({ isin: p.isin, rate: p.rate, maturity: p.maturity, issuer: p.issuer });
        accessControl = InstiVaultAccessControl(p.accessControl);
        factory = p.factory;

        if (p.initialSupply > 0) {
            _mint(p.issuer, p.initialSupply);
        }
    }

    function mint(address to, uint256 amount) external onlyFactoryOrIssuer {
        _mint(to, amount);
    }

    function burnAtMaturity() external {
        if (block.timestamp < metadata.maturity) {
            revert NotMatureYet(metadata.maturity, block.timestamp);
        }
        if (_hasBurnedAtMaturity[msg.sender]) {
            revert AlreadyBurnedAtMaturity(msg.sender);
        }
        uint256 balance = balanceOf(msg.sender);
        if (balance == 0) {
            revert NothingToBurn(msg.sender);
        }

        _hasBurnedAtMaturity[msg.sender] = true;
        _burn(msg.sender, balance);
    }

    function hasBurnedAtMaturity(address holder) external view returns (bool) {
        return _hasBurnedAtMaturity[holder];
    }

    function getMetadata() external view returns (string memory isin, uint256 rate, uint256 maturity, address issuer) {
        return (metadata.isin, metadata.rate, metadata.maturity, metadata.issuer);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && !accessControl.isWhitelisted(from)) {
            revert TransferNotWhitelisted(from);
        }
        if (to != address(0) && !accessControl.isWhitelisted(to)) {
            revert TransferNotWhitelisted(to);
        }

        super._update(from, to, value);
    }
}
