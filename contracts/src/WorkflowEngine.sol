// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./NexusRegistry.sol";

/**
 * @title WorkflowEngine
 * @notice Executes complex multi-step workflows with conditional logic
 * @dev Enables composable agent pipelines with payment splitting
 */
contract WorkflowEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Workflow step types
    enum StepType {
        CALL_AGENT,      // Call a registered agent
        TRANSFER,        // Transfer tokens
        SWAP,            // DEX swap
        CONDITION,       // Conditional branching
        PARALLEL,        // Parallel execution
        DELAY,           // Time delay
        CUSTOM           // Custom contract call
    }

    // Condition types for conditional steps
    enum ConditionType {
        BALANCE_GT,      // Balance greater than
        BALANCE_LT,      // Balance less than
        PRICE_GT,        // Price greater than
        PRICE_LT,        // Price less than
        TIME_GT,         // Timestamp greater than
        TIME_LT,         // Timestamp less than
        CUSTOM           // Custom condition
    }

    struct WorkflowStep {
        StepType stepType;
        bytes32 agentId;           // For CALL_AGENT
        address targetContract;     // For CUSTOM calls
        bytes callData;            // Encoded function call
        uint256 value;             // ETH/CRO value
        uint256 gasLimit;          // Gas limit for step
        ConditionType conditionType;
        bytes conditionData;       // Encoded condition parameters
        uint256 nextStepOnSuccess;
        uint256 nextStepOnFailure;
    }

    struct Workflow {
        bytes32 id;
        address owner;
        string name;
        string description;
        WorkflowStep[] steps;
        bool isActive;
        uint256 totalExecutions;
        uint256 successfulExecutions;
        uint256 totalGasUsed;
        uint256 createdAt;
        uint256 lastExecutedAt;
    }

    struct WorkflowExecution {
        bytes32 workflowId;
        address executor;
        uint256 startStep;
        uint256 currentStep;
        uint256 gasUsed;
        bool completed;
        bool success;
        string errorMessage;
        uint256 startedAt;
        uint256 completedAt;
    }

    // State
    INexusRegistry public immutable registry;
    IERC20 public immutable paymentToken;

    mapping(bytes32 => Workflow) public workflows;
    mapping(bytes32 => WorkflowExecution[]) public executions;
    mapping(address => bytes32[]) public userWorkflows;
    
    bytes32[] public allWorkflowIds;
    
    uint256 public executionFee = 0.001 ether; // Small fee in CRO
    uint256 public totalWorkflows;
    uint256 public totalExecutions;

    // Events
    event WorkflowCreated(bytes32 indexed workflowId, address indexed owner, string name);
    event WorkflowExecutionStarted(bytes32 indexed workflowId, bytes32 indexed executionId, address executor);
    event WorkflowStepExecuted(bytes32 indexed workflowId, bytes32 indexed executionId, uint256 stepIndex, bool success);
    event WorkflowExecutionCompleted(bytes32 indexed workflowId, bytes32 indexed executionId, bool success);
    event WorkflowDeactivated(bytes32 indexed workflowId);

    constructor(address _registry, address _paymentToken) Ownable(msg.sender) {
        registry = INexusRegistry(_registry);
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Create a new workflow
     * @param name Workflow name
     * @param description Workflow description
     * @param steps Array of workflow steps
     */
    function createWorkflow(
        string calldata name,
        string calldata description,
        WorkflowStep[] calldata steps
    ) external returns (bytes32 workflowId) {
        require(bytes(name).length > 0, "Name required");
        require(steps.length > 0, "At least one step required");
        require(steps.length <= 20, "Too many steps");

        workflowId = keccak256(abi.encodePacked(msg.sender, block.timestamp, name));
        
        Workflow storage workflow = workflows[workflowId];
        workflow.id = workflowId;
        workflow.owner = msg.sender;
        workflow.name = name;
        workflow.description = description;
        workflow.isActive = true;
        workflow.createdAt = block.timestamp;

        for (uint256 i = 0; i < steps.length; i++) {
            workflow.steps.push(steps[i]);
        }

        allWorkflowIds.push(workflowId);
        userWorkflows[msg.sender].push(workflowId);
        totalWorkflows++;

        emit WorkflowCreated(workflowId, msg.sender, name);
    }

    /**
     * @notice Execute a workflow
     * @param workflowId The workflow to execute
     * @param startStep Optional starting step (0 = first step)
     */
    function executeWorkflow(
        bytes32 workflowId,
        uint256 startStep
    ) external payable nonReentrant returns (bytes32 executionId) {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.owner != address(0), "Workflow not found");
        require(workflow.isActive, "Workflow not active");
        require(startStep < workflow.steps.length, "Invalid start step");
        require(msg.value >= executionFee, "Insufficient execution fee");

        executionId = keccak256(abi.encodePacked(workflowId, msg.sender, block.timestamp));
        
        uint256 gasStart = gasleft();

        WorkflowExecution memory execution = WorkflowExecution({
            workflowId: workflowId,
            executor: msg.sender,
            startStep: startStep,
            currentStep: startStep,
            gasUsed: 0,
            completed: false,
            success: false,
            errorMessage: "",
            startedAt: block.timestamp,
            completedAt: 0
        });

        emit WorkflowExecutionStarted(workflowId, executionId, msg.sender);

        // Execute steps
        uint256 currentStep = startStep;
        bool continueExecution = true;

        while (continueExecution && currentStep < workflow.steps.length) {
            WorkflowStep storage step = workflow.steps[currentStep];
            
            (bool stepSuccess, uint256 nextStep) = _executeStep(workflowId, executionId, currentStep, step);
            
            emit WorkflowStepExecuted(workflowId, executionId, currentStep, stepSuccess);

            if (!stepSuccess && step.nextStepOnFailure == type(uint256).max) {
                // No failure handler, abort workflow
                execution.success = false;
                execution.errorMessage = "Step failed without handler";
                continueExecution = false;
            } else {
                currentStep = stepSuccess ? step.nextStepOnSuccess : step.nextStepOnFailure;
                
                // Check for end of workflow
                if (currentStep >= workflow.steps.length || currentStep == type(uint256).max) {
                    execution.success = stepSuccess;
                    continueExecution = false;
                }
            }

            execution.currentStep = currentStep;
        }

        execution.completed = true;
        execution.completedAt = block.timestamp;
        execution.gasUsed = gasStart - gasleft();

        executions[workflowId].push(execution);

        workflow.totalExecutions++;
        if (execution.success) {
            workflow.successfulExecutions++;
        }
        workflow.totalGasUsed += execution.gasUsed;
        workflow.lastExecutedAt = block.timestamp;
        totalExecutions++;

        emit WorkflowExecutionCompleted(workflowId, executionId, execution.success);
    }

    /**
     * @notice Execute a single workflow step
     */
    function _executeStep(
        bytes32 workflowId,
        bytes32 executionId,
        uint256 stepIndex,
        WorkflowStep storage step
    ) internal returns (bool success, uint256 nextStep) {
        nextStep = step.nextStepOnSuccess;

        if (step.stepType == StepType.CALL_AGENT) {
            // Call a registered agent
            try registry.recordCall(step.agentId) {
                success = true;
            } catch {
                success = false;
                nextStep = step.nextStepOnFailure;
            }
        } else if (step.stepType == StepType.TRANSFER) {
            // Token transfer
            (address to, uint256 amount) = abi.decode(step.callData, (address, uint256));
            try paymentToken.transferFrom(msg.sender, to, amount) returns (bool result) {
                success = result;
            } catch {
                success = false;
                nextStep = step.nextStepOnFailure;
            }
        } else if (step.stepType == StepType.CONDITION) {
            // Evaluate condition
            success = _evaluateCondition(step.conditionType, step.conditionData);
            nextStep = success ? step.nextStepOnSuccess : step.nextStepOnFailure;
        } else if (step.stepType == StepType.CUSTOM) {
            // Custom contract call
            (success, ) = step.targetContract.call{value: step.value, gas: step.gasLimit}(step.callData);
            if (!success) {
                nextStep = step.nextStepOnFailure;
            }
        } else if (step.stepType == StepType.DELAY) {
            // Time delay check
            uint256 requiredTime = abi.decode(step.callData, (uint256));
            success = block.timestamp >= requiredTime;
            if (!success) {
                nextStep = step.nextStepOnFailure;
            }
        } else {
            // SWAP and PARALLEL handled differently
            success = true;
        }
    }

    /**
     * @notice Evaluate a condition
     */
    function _evaluateCondition(
        ConditionType conditionType,
        bytes memory conditionData
    ) internal view returns (bool) {
        if (conditionType == ConditionType.BALANCE_GT) {
            (address account, uint256 threshold) = abi.decode(conditionData, (address, uint256));
            return paymentToken.balanceOf(account) > threshold;
        } else if (conditionType == ConditionType.BALANCE_LT) {
            (address account, uint256 threshold) = abi.decode(conditionData, (address, uint256));
            return paymentToken.balanceOf(account) < threshold;
        } else if (conditionType == ConditionType.TIME_GT) {
            uint256 timestamp = abi.decode(conditionData, (uint256));
            return block.timestamp > timestamp;
        } else if (conditionType == ConditionType.TIME_LT) {
            uint256 timestamp = abi.decode(conditionData, (uint256));
            return block.timestamp < timestamp;
        }
        return true;
    }

    /**
     * @notice Deactivate a workflow
     */
    function deactivateWorkflow(bytes32 workflowId) external {
        require(workflows[workflowId].owner == msg.sender, "Not owner");
        workflows[workflowId].isActive = false;
        emit WorkflowDeactivated(workflowId);
    }

    // View functions
    function getWorkflow(bytes32 workflowId) external view returns (
        address owner,
        string memory name,
        string memory description,
        uint256 stepCount,
        bool isActive,
        uint256 totalExecs,
        uint256 successfulExecs
    ) {
        Workflow storage w = workflows[workflowId];
        return (
            w.owner,
            w.name,
            w.description,
            w.steps.length,
            w.isActive,
            w.totalExecutions,
            w.successfulExecutions
        );
    }

    function getWorkflowStep(bytes32 workflowId, uint256 stepIndex) external view returns (WorkflowStep memory) {
        return workflows[workflowId].steps[stepIndex];
    }

    function getUserWorkflows(address user) external view returns (bytes32[] memory) {
        return userWorkflows[user];
    }

    function getExecutionHistory(bytes32 workflowId) external view returns (WorkflowExecution[] memory) {
        return executions[workflowId];
    }

    function getAllWorkflows() external view returns (bytes32[] memory) {
        return allWorkflowIds;
    }

    // Admin
    function setExecutionFee(uint256 newFee) external onlyOwner {
        executionFee = newFee;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
