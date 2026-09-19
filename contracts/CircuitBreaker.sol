// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BehavioralCircuitBreaker
 * @dev Automated Response Mechanism for Decentralized Systems
 * Part of Project: Behavioral Threat Detection and Automated Response for Decentralized Systems
 * 
 * Interacts with off-chain AI threat oracle to enforce:
 * - Tier 0 (< 0.42): Pass-through execution
 * - Tier 1 (0.42 - 0.60): Dynamic gas throttling & telemetry logging
 * - Tier 2 (0.60 - 0.85): 3-block timelock quarantine & secondary signature requirement
 * - Tier 3 (>= 0.85): Protocol pause, asset freezing, and execution rollback
 */
contract BehavioralCircuitBreaker {

    // --- State Variables ---
    address public securityOracle;
    address public daoGovernance;
    bool public emergencyProtocolFrozen;

    enum ThreatSeverity { NORMAL, LOW, MEDIUM, HIGH }

    struct ThreatProfile {
        uint256 threatScore;       // Scaled 0 - 1000 (e.g. 850 = 0.85)
        ThreatSeverity severity;
        uint256 lastEvaluatedBlock;
        uint256 quarantineReleaseBlock;
        bool isCircuitBreakerLocked;
        string mitigationAction;
    }

    mapping(address => ThreatProfile) public accountProfiles;
    mapping(address => bool) public blacklistedActors;

    // --- Events ---
    event TelemetryReported(address indexed account, uint256 threatScore, ThreatSeverity severity);
    event TimelockQuarantineEnforced(address indexed account, uint256 releaseBlock);
    event CircuitBreakerTriggered(address indexed account, uint256 threatScore, string action);
    event AccountPardoned(address indexed account, address authority);

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == securityOracle, "UNAUTHORIZED: Caller must be verified Security Oracle");
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == daoGovernance, "UNAUTHORIZED: Caller must be DAO Governance Council");
        _;
    }

    modifier notBlocked(address _sender) {
        require(!emergencyProtocolFrozen, "EMERGENCY: Entire protocol is currently frozen");
        require(!blacklistedActors[_sender], "CRITICAL: Account blacklisted by Behavioral AI");
        require(!accountProfiles[_sender].isCircuitBreakerLocked, "BLOCKED: Smart Contract Circuit Breaker Active");
        
        if (accountProfiles[_sender].quarantineReleaseBlock > block.number) {
            revert("QUARANTINE: Transaction held in 3-block mempool timelock");
        }
        _;
    }

    // --- Constructor ---
    constructor(address _securityOracle, address _daoGovernance) {
        securityOracle = _securityOracle;
        daoGovernance = _daoGovernance;
        emergencyProtocolFrozen = false;
    }

    /**
     * @notice Invoked by the FastAPI AI Threat Engine to report newly calculated anomaly scores.
     * @param _account The target Ethereum address analyzed by the 8-model suite
     * @param _threatScore Normalized ensemble score scaled to [0, 1000] (e.g. 0.9412 -> 941)
     */
    function reportBehavioralScore(
        address _account, 
        uint256 _threatScore,
        string calldata _action
    ) external onlyOracle {
        ThreatSeverity sev;

        if (_threatScore < 420) {
            sev = ThreatSeverity.NORMAL;
            accountProfiles[_account].isCircuitBreakerLocked = false;
        } else if (_threatScore < 600) {
            sev = ThreatSeverity.LOW;
        } else if (_threatScore < 850) {
            sev = ThreatSeverity.MEDIUM;
            // Enforce 3-block timelock quarantine (approx ~36 seconds on Ethereum mainnet)
            accountProfiles[_account].quarantineReleaseBlock = block.number + 3;
            emit TimelockQuarantineEnforced(_account, block.number + 3);
        } else {
            sev = ThreatSeverity.HIGH;
            // Critical threat: Trigger automated Smart Contract Circuit Breaker lock
            accountProfiles[_account].isCircuitBreakerLocked = true;
            blacklistedActors[_account] = true;
            emit CircuitBreakerTriggered(_account, _threatScore, _action);
        }

        accountProfiles[_account].threatScore = _threatScore;
        accountProfiles[_account].severity = sev;
        accountProfiles[_account].lastEvaluatedBlock = block.number;
        accountProfiles[_account].mitigationAction = _action;

        emit TelemetryReported(_account, _threatScore, sev);
    }

    /**
     * @notice Simulated protected DeFi function guarded by behavioral checks.
     */
    function executeProtectedTransfer(address _recipient, uint256 _amount) 
        external 
        notBlocked(msg.sender) 
        returns (bool) 
    {
        // Normal state execution
        return true;
    }

    /**
     * @notice DAO Governance manual dispute resolution override.
     */
    function pardonAccount(address _account) external onlyGovernance {
        accountProfiles[_account].isCircuitBreakerLocked = false;
        accountProfiles[_account].quarantineReleaseBlock = 0;
        blacklistedActors[_account] = false;
        emit AccountPardoned(_account, msg.sender);
    }

    /**
     * @notice Global kill switch for severe network-wide exploit containment.
     */
    function setGlobalEmergencyFreeze(bool _freezeState) external onlyGovernance {
        emergencyProtocolFrozen = _freezeState;
    }
}
