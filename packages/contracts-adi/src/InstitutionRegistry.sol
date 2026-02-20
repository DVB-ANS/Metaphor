// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { InstiVaultAccessControl } from "./InstiVaultAccessControl.sol";
import { RWATokenFactory } from "./RWATokenFactory.sol";
import { VaultManager } from "./VaultManager.sol";

/// @title InstitutionRegistry
/// @notice Multi-tenant white-label registry: each institution gets isolated AccessControl + TokenFactory + VaultManager
contract InstitutionRegistry {
    struct Institution {
        uint256 id;
        string name;
        address admin;
        address accessControl;
        address tokenFactory;
        address vaultManager;
        bool active;
    }

    InstiVaultAccessControl public platformAccessControl;

    uint256 private _nextInstitutionId;
    mapping(uint256 => Institution) private _institutions;
    mapping(address => uint256[]) private _adminInstitutions;

    // ─── Multisig ─────────────────────────────────────────────────────
    uint256 public constant REQUIRED_APPROVALS = 2;

    struct Proposal {
        uint256 id;
        string institutionName;
        address institutionAdmin;
        uint256 approvalCount;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    uint256 private _nextProposalId;
    mapping(uint256 => Proposal) private _proposals;

    // ─── Events ───────────────────────────────────────────────────────

    event InstitutionRegistered(
        uint256 indexed institutionId,
        string name,
        address indexed admin,
        address accessControl,
        address tokenFactory,
        address vaultManager
    );
    event InstitutionDeactivated(uint256 indexed institutionId);
    event ProposalCreated(uint256 indexed proposalId, string institutionName, address institutionAdmin, address proposer);
    event ProposalApproved(uint256 indexed proposalId, address approver, uint256 approvalCount);
    event ProposalExecuted(uint256 indexed proposalId, uint256 institutionId);

    // ─── Errors ───────────────────────────────────────────────────────

    error NotPlatformAdmin();
    error EmptyName();
    error ZeroAddress();
    error InstitutionNotFound(uint256 institutionId);
    error InstitutionNotActive(uint256 institutionId);
    error ProposalNotFound(uint256 proposalId);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error AlreadyApproved(uint256 proposalId, address approver);
    error InsufficientApprovals(uint256 proposalId, uint256 current, uint256 required);

    // ─── Modifiers ────────────────────────────────────────────────────

    modifier onlyPlatformAdmin() {
        if (!platformAccessControl.hasRole(platformAccessControl.ADMIN_ROLE(), msg.sender)) {
            revert NotPlatformAdmin();
        }
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(address platformAccessControl_) {
        platformAccessControl = InstiVaultAccessControl(platformAccessControl_);
    }

    // ─── Multisig Proposal Flow ───────────────────────────────────────

    /// @notice Propose registering a new institution (requires 2 admin approvals)
    function proposeInstitution(string calldata name, address admin) external onlyPlatformAdmin returns (uint256) {
        if (bytes(name).length == 0) revert EmptyName();
        if (admin == address(0)) revert ZeroAddress();

        uint256 proposalId = _nextProposalId++;
        Proposal storage p = _proposals[proposalId];
        p.id = proposalId;
        p.institutionName = name;
        p.institutionAdmin = admin;
        p.approvalCount = 1;
        p.hasApproved[msg.sender] = true;

        emit ProposalCreated(proposalId, name, admin, msg.sender);
        emit ProposalApproved(proposalId, msg.sender, 1);

        return proposalId;
    }

    /// @notice Approve a pending proposal
    function approveProposal(uint256 proposalId) external onlyPlatformAdmin {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0 && proposalId != 0) revert ProposalNotFound(proposalId);
        if (p.executed) revert ProposalAlreadyExecuted(proposalId);
        if (p.hasApproved[msg.sender]) revert AlreadyApproved(proposalId, msg.sender);

        p.hasApproved[msg.sender] = true;
        p.approvalCount++;

        emit ProposalApproved(proposalId, msg.sender, p.approvalCount);
    }

    /// @notice Execute a proposal that has enough approvals
    function executeProposal(uint256 proposalId) external onlyPlatformAdmin returns (uint256) {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0 && proposalId != 0) revert ProposalNotFound(proposalId);
        if (p.executed) revert ProposalAlreadyExecuted(proposalId);
        if (p.approvalCount < REQUIRED_APPROVALS) {
            revert InsufficientApprovals(proposalId, p.approvalCount, REQUIRED_APPROVALS);
        }

        p.executed = true;
        uint256 institutionId = _deployInstitution(p.institutionName, p.institutionAdmin);

        emit ProposalExecuted(proposalId, institutionId);
        return institutionId;
    }

    // ─── Direct Registration (single admin, for testing/hackathon) ───

    /// @notice Register an institution directly (no multisig, for hackathon demo)
    function registerInstitution(string calldata name, address admin)
        external
        onlyPlatformAdmin
        returns (uint256)
    {
        if (bytes(name).length == 0) revert EmptyName();
        if (admin == address(0)) revert ZeroAddress();

        return _deployInstitution(name, admin);
    }

    // ─── Admin ────────────────────────────────────────────────────────

    /// @notice Deactivate an institution
    function deactivateInstitution(uint256 institutionId) external onlyPlatformAdmin {
        if (institutionId >= _nextInstitutionId) revert InstitutionNotFound(institutionId);
        if (!_institutions[institutionId].active) revert InstitutionNotActive(institutionId);

        _institutions[institutionId].active = false;
        emit InstitutionDeactivated(institutionId);
    }

    // ─── Views ────────────────────────────────────────────────────────

    function getInstitution(uint256 institutionId)
        external
        view
        returns (
            string memory name,
            address admin,
            address accessControl,
            address tokenFactory,
            address vaultManager,
            bool active
        )
    {
        if (institutionId >= _nextInstitutionId) revert InstitutionNotFound(institutionId);
        Institution storage inst = _institutions[institutionId];
        return (inst.name, inst.admin, inst.accessControl, inst.tokenFactory, inst.vaultManager, inst.active);
    }

    function getInstitutionCount() external view returns (uint256) {
        return _nextInstitutionId;
    }

    function getAdminInstitutions(address admin) external view returns (uint256[] memory) {
        return _adminInstitutions[admin];
    }

    function getProposalApprovalCount(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].approvalCount;
    }

    function isProposalExecuted(uint256 proposalId) external view returns (bool) {
        return _proposals[proposalId].executed;
    }

    function hasApprovedProposal(uint256 proposalId, address approver) external view returns (bool) {
        return _proposals[proposalId].hasApproved[approver];
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _deployInstitution(string memory name, address admin) internal returns (uint256 institutionId) {
        // Deploy isolated contracts for this institution
        InstiVaultAccessControl ac = new InstiVaultAccessControl(admin);
        RWATokenFactory factory = new RWATokenFactory(address(ac));
        VaultManager vault = new VaultManager(address(ac), address(factory));

        institutionId = _nextInstitutionId++;
        _institutions[institutionId] = Institution({
            id: institutionId,
            name: name,
            admin: admin,
            accessControl: address(ac),
            tokenFactory: address(factory),
            vaultManager: address(vault),
            active: true
        });

        _adminInstitutions[admin].push(institutionId);

        emit InstitutionRegistered(institutionId, name, admin, address(ac), address(factory), address(vault));
    }
}
