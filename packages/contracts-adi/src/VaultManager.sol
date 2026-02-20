// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { InstiVaultAccessControl } from "./InstiVaultAccessControl.sol";
import { RWATokenFactory } from "./RWATokenFactory.sol";

contract VaultManager {
    using SafeERC20 for IERC20;

    enum VaultStatus {
        Active,
        Paused,
        Closed
    }

    struct Vault {
        uint256 id;
        address owner;
        VaultStatus status;
        uint256 createdAt;
    }

    InstiVaultAccessControl public accessControl;
    RWATokenFactory public tokenFactory;

    uint256 public nextVaultId;
    mapping(uint256 => Vault) public vaults;
    // vaultId => token => depositor => balance
    mapping(uint256 => mapping(address => mapping(address => uint256))) public deposits;
    // vaultId => token => total deposited
    mapping(uint256 => mapping(address => uint256)) public vaultTokenBalances;
    // vaultId => list of tokens that have been deposited
    mapping(uint256 => address[]) public vaultTokens;
    mapping(uint256 => mapping(address => bool)) private _tokenTracked;

    event VaultCreated(uint256 indexed vaultId, address indexed owner);
    event Deposited(uint256 indexed vaultId, address indexed token, address indexed depositor, uint256 amount);
    event Withdrawn(uint256 indexed vaultId, address indexed token, address indexed depositor, uint256 amount);
    event VaultStatusChanged(uint256 indexed vaultId, VaultStatus newStatus);

    error NotIssuer();
    error NotInvestor();
    error NotAdmin();
    error NotWhitelisted(address account);
    error VaultNotActive(uint256 vaultId);
    error VaultDoesNotExist(uint256 vaultId);
    error InsufficientBalance(uint256 vaultId, address token, uint256 requested, uint256 available);
    error TokenNotRegistered(address token);
    error ZeroAmount();

    modifier onlyIssuer() {
        if (!accessControl.hasRole(accessControl.ISSUER_ROLE(), msg.sender)) {
            revert NotIssuer();
        }
        _;
    }

    modifier onlyInvestor() {
        if (!accessControl.hasRole(accessControl.INVESTOR_ROLE(), msg.sender)) {
            revert NotInvestor();
        }
        _;
    }

    modifier onlyAdmin() {
        if (!accessControl.hasRole(accessControl.ADMIN_ROLE(), msg.sender)) {
            revert NotAdmin();
        }
        _;
    }

    modifier vaultExists(uint256 vaultId) {
        if (vaultId >= nextVaultId) {
            revert VaultDoesNotExist(vaultId);
        }
        _;
    }

    modifier vaultActive(uint256 vaultId) {
        if (vaults[vaultId].status != VaultStatus.Active) {
            revert VaultNotActive(vaultId);
        }
        _;
    }

    constructor(address accessControl_, address tokenFactory_) {
        accessControl = InstiVaultAccessControl(accessControl_);
        tokenFactory = RWATokenFactory(tokenFactory_);
    }

    function createVault() external onlyIssuer returns (uint256) {
        uint256 vaultId = nextVaultId++;

        vaults[vaultId] =
            Vault({ id: vaultId, owner: msg.sender, status: VaultStatus.Active, createdAt: block.timestamp });

        emit VaultCreated(vaultId, msg.sender);
        return vaultId;
    }

    function deposit(uint256 vaultId, address token, uint256 amount)
        external
        vaultExists(vaultId)
        vaultActive(vaultId)
        onlyInvestor
    {
        if (amount == 0) revert ZeroAmount();
        if (!accessControl.isWhitelisted(msg.sender)) revert NotWhitelisted(msg.sender);
        if (!tokenFactory.isRegistered(token)) revert TokenNotRegistered(token);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        deposits[vaultId][token][msg.sender] += amount;
        vaultTokenBalances[vaultId][token] += amount;

        if (!_tokenTracked[vaultId][token]) {
            vaultTokens[vaultId].push(token);
            _tokenTracked[vaultId][token] = true;
        }

        emit Deposited(vaultId, token, msg.sender, amount);
    }

    function withdraw(uint256 vaultId, address token, uint256 amount)
        external
        vaultExists(vaultId)
        vaultActive(vaultId)
        onlyInvestor
    {
        if (amount == 0) revert ZeroAmount();

        uint256 available = deposits[vaultId][token][msg.sender];
        if (amount > available) {
            revert InsufficientBalance(vaultId, token, amount, available);
        }

        deposits[vaultId][token][msg.sender] -= amount;
        vaultTokenBalances[vaultId][token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(vaultId, token, msg.sender, amount);
    }

    function pauseVault(uint256 vaultId) external vaultExists(vaultId) onlyAdmin {
        vaults[vaultId].status = VaultStatus.Paused;
        emit VaultStatusChanged(vaultId, VaultStatus.Paused);
    }

    function unpauseVault(uint256 vaultId) external vaultExists(vaultId) onlyAdmin {
        vaults[vaultId].status = VaultStatus.Active;
        emit VaultStatusChanged(vaultId, VaultStatus.Active);
    }

    function closeVault(uint256 vaultId) external vaultExists(vaultId) onlyAdmin {
        vaults[vaultId].status = VaultStatus.Closed;
        emit VaultStatusChanged(vaultId, VaultStatus.Closed);
    }

    function getVaultInfo(uint256 vaultId)
        external
        view
        vaultExists(vaultId)
        returns (address owner, VaultStatus status, uint256 createdAt)
    {
        Vault storage v = vaults[vaultId];
        return (v.owner, v.status, v.createdAt);
    }

    function getVaultBalance(uint256 vaultId, address token) external view returns (uint256) {
        return vaultTokenBalances[vaultId][token];
    }

    function getDepositorBalance(uint256 vaultId, address token, address depositor) external view returns (uint256) {
        return deposits[vaultId][token][depositor];
    }

    function getVaultTokens(uint256 vaultId) external view returns (address[] memory) {
        return vaultTokens[vaultId];
    }
}
