// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title INexusRegistry
 * @notice Interface for the NEXUS-402 Agent Registry
 */
interface INexusRegistry {
    struct Agent {
        address owner;
        address paymentAddress;
        string metadataUri;
        string[] capabilities;
        uint256 pricePerCall;
        uint256 totalCalls;
        uint256 totalRevenue;
        uint256 rating;
        uint256 ratingCount;
        bool isActive;
        uint256 createdAt;
        uint256 lastActiveAt;
    }

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadataUri);
    event AgentUpdated(bytes32 indexed agentId, string metadataUri);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentActivated(bytes32 indexed agentId);
    event AgentCalled(bytes32 indexed agentId, address indexed caller, uint256 payment);
    event AgentRated(bytes32 indexed agentId, address indexed rater, uint8 rating);

    function registerAgent(
        string calldata metadataUri,
        string[] calldata capabilities,
        uint256 pricePerCall,
        address paymentAddress
    ) external returns (bytes32 agentId);

    function getAgent(bytes32 agentId) external view returns (Agent memory);
    function isAgentActive(bytes32 agentId) external view returns (bool);
    function recordCall(bytes32 agentId) external;
}

/**
 * @title NexusRegistry
 * @notice Central registry for AI agents in the NEXUS-402 ecosystem
 * @dev Manages agent registration, discovery, reputation, and payment routing
 */
contract NexusRegistry is INexusRegistry, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32[]) public ownerAgents;
    mapping(string => bytes32[]) public capabilityToAgents;
    
    bytes32[] public allAgentIds;
    
    IERC20 public immutable paymentToken; // USDC.e on Cronos
    
    uint256 public platformFeeRate = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE_RATE = 1000; // 10% max
    uint256 public constant BASIS_POINTS = 10000;
    
    uint256 public totalAgents;
    uint256 public totalCalls;
    uint256 public totalVolume;

    // Modifiers
    modifier onlyAgentOwner(bytes32 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(agents[agentId].owner != address(0), "Agent not found");
        _;
    }

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Register a new AI agent
     * @param metadataUri IPFS/HTTP URI containing agent metadata
     * @param capabilities List of capabilities (e.g., "defi", "payments", "analytics")
     * @param pricePerCall Price in USDC.e per API call
     * @param paymentAddress Address to receive payments
     */
    function registerAgent(
        string calldata metadataUri,
        string[] calldata capabilities,
        uint256 pricePerCall,
        address paymentAddress
    ) external override returns (bytes32 agentId) {
        require(bytes(metadataUri).length > 0, "Invalid metadata URI");
        require(capabilities.length > 0, "At least one capability required");
        require(paymentAddress != address(0), "Invalid payment address");

        agentId = keccak256(abi.encodePacked(msg.sender, block.timestamp, metadataUri));
        
        require(agents[agentId].owner == address(0), "Agent already exists");

        agents[agentId] = Agent({
            owner: msg.sender,
            paymentAddress: paymentAddress,
            metadataUri: metadataUri,
            capabilities: capabilities,
            pricePerCall: pricePerCall,
            totalCalls: 0,
            totalRevenue: 0,
            rating: 0,
            ratingCount: 0,
            isActive: true,
            createdAt: block.timestamp,
            lastActiveAt: block.timestamp
        });

        allAgentIds.push(agentId);
        ownerAgents[msg.sender].push(agentId);
        
        for (uint256 i = 0; i < capabilities.length; i++) {
            capabilityToAgents[capabilities[i]].push(agentId);
        }

        totalAgents++;

        emit AgentRegistered(agentId, msg.sender, metadataUri);
    }

    /**
     * @notice Record an agent call and process payment
     * @param agentId The agent being called
     */
    function recordCall(bytes32 agentId) external nonReentrant agentExists(agentId) {
        Agent storage agent = agents[agentId];
        require(agent.isActive, "Agent not active");

        uint256 payment = agent.pricePerCall;
        
        if (payment > 0) {
            uint256 platformFee = (payment * platformFeeRate) / BASIS_POINTS;
            uint256 agentPayment = payment - platformFee;

            paymentToken.safeTransferFrom(msg.sender, address(this), platformFee);
            paymentToken.safeTransferFrom(msg.sender, agent.paymentAddress, agentPayment);

            agent.totalRevenue += agentPayment;
            totalVolume += payment;
        }

        agent.totalCalls++;
        agent.lastActiveAt = block.timestamp;
        totalCalls++;

        emit AgentCalled(agentId, msg.sender, payment);
    }

    /**
     * @notice Rate an agent (1-5 stars)
     * @param agentId The agent to rate
     * @param rating Rating from 1-5
     */
    function rateAgent(bytes32 agentId, uint8 rating) external agentExists(agentId) {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        
        Agent storage agent = agents[agentId];
        
        // Calculate new average rating (scaled by 100 for precision)
        uint256 totalRating = agent.rating * agent.ratingCount;
        agent.ratingCount++;
        agent.rating = (totalRating + (rating * 100)) / agent.ratingCount;

        emit AgentRated(agentId, msg.sender, rating);
    }

    /**
     * @notice Update agent metadata
     */
    function updateAgent(
        bytes32 agentId,
        string calldata metadataUri,
        uint256 pricePerCall
    ) external onlyAgentOwner(agentId) {
        Agent storage agent = agents[agentId];
        agent.metadataUri = metadataUri;
        agent.pricePerCall = pricePerCall;

        emit AgentUpdated(agentId, metadataUri);
    }

    /**
     * @notice Deactivate an agent
     */
    function deactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Activate an agent
     */
    function activateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].isActive = true;
        emit AgentActivated(agentId);
    }

    // View functions
    function getAgent(bytes32 agentId) external view override returns (Agent memory) {
        return agents[agentId];
    }

    function isAgentActive(bytes32 agentId) external view override returns (bool) {
        return agents[agentId].isActive;
    }

    function getAgentsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    function getAgentsByCapability(string calldata capability) external view returns (bytes32[] memory) {
        return capabilityToAgents[capability];
    }

    function getAllAgents() external view returns (bytes32[] memory) {
        return allAgentIds;
    }

    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalAgents, totalCalls, totalVolume);
    }

    // Admin functions
    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= MAX_FEE_RATE, "Fee too high");
        platformFeeRate = newRate;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        paymentToken.safeTransfer(to, balance);
    }
}
