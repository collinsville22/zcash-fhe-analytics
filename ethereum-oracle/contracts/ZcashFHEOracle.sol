pragma solidity ^0.8.19;

contract ZcashFHEOracle {
    struct Metric {
        uint256 value;
        uint256 timestamp;
        string metricType;
        uint8 updateCount;
        bool isActive;
    }
    
    struct UpdateProposal {
        string metricType;
        uint256 proposedValue;
        uint256 proposalTime;
        uint8 approvalCount;
        mapping(address => bool) hasApproved;
        bool executed;
    }
    
    mapping(string => Metric) public metrics;
    mapping(address => bool) public authorized_updaters;
    mapping(uint256 => UpdateProposal) public proposals;
    
    address public owner;
    uint8 public threshold;
    uint256 public proposalCounter;
    string[] public allMetricTypes;
    
    event MetricUpdated(
        string indexed metricType,
        uint256 value,
        uint256 timestamp,
        address updater
    );
    
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);
    event ProposalCreated(uint256 indexed proposalId, string metricType, uint256 value);
    event ProposalApproved(uint256 indexed proposalId, address approver);
    event ProposalExecuted(uint256 indexed proposalId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorized_updaters[msg.sender], "Not authorized");
        _;
    }
    
    constructor(uint8 _threshold) {
        owner = msg.sender;
        threshold = _threshold;
        authorized_updaters[msg.sender] = true;
    }
    
    function initializeMetric(string memory _metricType) external onlyOwner {
        require(bytes(metrics[_metricType].metricType).length == 0, "Metric exists");
        
        metrics[_metricType] = Metric({
            value: 0,
            timestamp: block.timestamp,
            metricType: _metricType,
            updateCount: 0,
            isActive: true
        });
        
        allMetricTypes.push(_metricType);
        emit MetricUpdated(_metricType, 0, block.timestamp, msg.sender);
    }
    
    function proposeUpdate(
        string memory _metricType,
        uint256 _value
    ) external onlyAuthorized returns (uint256) {
        require(metrics[_metricType].isActive, "Metric not active");
        
        uint256 proposalId = proposalCounter++;
        UpdateProposal storage proposal = proposals[proposalId];
        
        proposal.metricType = _metricType;
        proposal.proposedValue = _value;
        proposal.proposalTime = block.timestamp;
        proposal.approvalCount = 1;
        proposal.hasApproved[msg.sender] = true;
        proposal.executed = false;
        
        emit ProposalCreated(proposalId, _metricType, _value);
        
        if (threshold == 1) {
            _executeProposal(proposalId);
        }
        
        return proposalId;
    }
    
    function approveProposal(uint256 _proposalId) external onlyAuthorized {
        UpdateProposal storage proposal = proposals[_proposalId];
        
        require(!proposal.executed, "Already executed");
        require(!proposal.hasApproved[msg.sender], "Already approved");
        require(block.timestamp <= proposal.proposalTime + 1 hours, "Proposal expired");
        
        proposal.hasApproved[msg.sender] = true;
        proposal.approvalCount++;
        
        emit ProposalApproved(_proposalId, msg.sender);
        
        if (proposal.approvalCount >= threshold) {
            _executeProposal(_proposalId);
        }
    }
    
    function _executeProposal(uint256 _proposalId) internal {
        UpdateProposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Already executed");
        
        Metric storage metric = metrics[proposal.metricType];
        metric.value = proposal.proposedValue;
        metric.timestamp = block.timestamp;
        metric.updateCount++;
        
        proposal.executed = true;
        
        emit ProposalExecuted(_proposalId);
        emit MetricUpdated(
            proposal.metricType,
            proposal.proposedValue,
            block.timestamp,
            msg.sender
        );
    }
    
    function getValue(string memory _metricType) external view returns (uint256, uint256) {
        Metric memory metric = metrics[_metricType];
        return (metric.value, metric.timestamp);
    }
    
    function getAllMetrics() external view returns (string[] memory) {
        return allMetricTypes;
    }
    
    function getMetricDetails(string memory _metricType) 
        external 
        view 
        returns (uint256 value, uint256 timestamp, uint8 updateCount, bool isActive) 
    {
        Metric memory metric = metrics[_metricType];
        return (metric.value, metric.timestamp, metric.updateCount, metric.isActive);
    }
    
    function authorizeUpdater(address _updater) external onlyOwner {
        authorized_updaters[_updater] = true;
        emit UpdaterAuthorized(_updater);
    }
    
    function revokeUpdater(address _updater) external onlyOwner {
        authorized_updaters[_updater] = false;
        emit UpdaterRevoked(_updater);
    }
    
    function pauseMetric(string memory _metricType) external onlyOwner {
        metrics[_metricType].isActive = false;
    }
    
    function unpauseMetric(string memory _metricType) external onlyOwner {
        metrics[_metricType].isActive = true;
    }
}
