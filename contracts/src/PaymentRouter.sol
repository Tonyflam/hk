// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title IERC20WithPermit
 * @notice EIP-3009 interface for USDC.e transferWithAuthorization
 */
interface IERC20WithPermit {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external;

    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external;
}

/**
 * @title PaymentRouter
 * @notice Advanced payment routing with x402 protocol support
 * @dev Implements EIP-3009 transferWithAuthorization for gasless payments
 */
contract PaymentRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Payment types
    enum PaymentType {
        SIMPLE,          // Direct transfer
        SPLIT,           // Multiple recipients
        STREAMING,       // Time-based streaming
        CONDITIONAL,     // Condition-based release
        ESCROW,          // Escrow with arbitration
        RECURRING        // Recurring payments
    }

    struct Payment {
        bytes32 id;
        address payer;
        PaymentType paymentType;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 createdAt;
        uint256 completedAt;
        bool isCompleted;
        bool isCancelled;
    }

    struct SplitRecipient {
        address recipient;
        uint256 basisPoints; // Out of 10000
    }

    struct StreamingPayment {
        bytes32 paymentId;
        address recipient;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 lastClaimTime;
    }

    struct ConditionalPayment {
        bytes32 paymentId;
        address recipient;
        uint256 amount;
        address conditionContract;
        bytes conditionData;
        bool isReleased;
    }

    struct RecurringPayment {
        bytes32 id;
        address payer;
        address recipient;
        uint256 amount;
        uint256 interval;  // Seconds between payments
        uint256 nextPaymentTime;
        uint256 totalPayments;
        uint256 completedPayments;
        bool isActive;
    }

    // State
    IERC20 public immutable paymentToken;
    IERC20WithPermit public immutable paymentTokenWithPermit;

    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => SplitRecipient[]) public splitRecipients;
    mapping(bytes32 => StreamingPayment) public streamingPayments;
    mapping(bytes32 => ConditionalPayment) public conditionalPayments;
    mapping(bytes32 => RecurringPayment) public recurringPayments;
    
    mapping(address => bytes32[]) public userPayments;
    mapping(bytes32 => bool) public usedNonces;

    uint256 public totalPaymentsProcessed;
    uint256 public totalVolumeProcessed;

    // Events
    event PaymentCreated(bytes32 indexed paymentId, address indexed payer, PaymentType paymentType, uint256 amount);
    event PaymentCompleted(bytes32 indexed paymentId, uint256 totalReleased);
    event PaymentCancelled(bytes32 indexed paymentId);
    event SplitPaymentExecuted(bytes32 indexed paymentId, uint256 recipientCount, uint256 totalAmount);
    event StreamPaymentClaimed(bytes32 indexed paymentId, address recipient, uint256 amount);
    event ConditionalPaymentReleased(bytes32 indexed paymentId, address recipient, uint256 amount);
    event RecurringPaymentExecuted(bytes32 indexed paymentId, uint256 paymentNumber);
    event X402PaymentProcessed(address indexed from, address indexed to, uint256 amount, bytes32 nonce);

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        paymentTokenWithPermit = IERC20WithPermit(_paymentToken);
    }

    /**
     * @notice Process an x402 payment using EIP-3009 transferWithAuthorization
     * @dev This is the core x402 payment flow
     */
    function processX402Payment(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external nonReentrant {
        require(!usedNonces[nonce], "Nonce already used");
        require(block.timestamp >= validAfter, "Payment not yet valid");
        require(block.timestamp < validBefore, "Payment expired");

        usedNonces[nonce] = true;

        // Execute EIP-3009 transfer
        paymentTokenWithPermit.transferWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );

        totalPaymentsProcessed++;
        totalVolumeProcessed += value;

        emit X402PaymentProcessed(from, to, value, nonce);
    }

    /**
     * @notice Create a split payment to multiple recipients
     */
    function createSplitPayment(
        SplitRecipient[] calldata recipients,
        uint256 totalAmount
    ) external nonReentrant returns (bytes32 paymentId) {
        require(recipients.length > 0 && recipients.length <= 20, "Invalid recipient count");
        
        uint256 totalBps;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i].recipient != address(0), "Invalid recipient");
            totalBps += recipients[i].basisPoints;
        }
        require(totalBps == 10000, "Basis points must sum to 10000");

        paymentId = keccak256(abi.encodePacked(msg.sender, block.timestamp, totalAmount, "SPLIT"));

        // Transfer from sender
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Distribute to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 recipientAmount = (totalAmount * recipients[i].basisPoints) / 10000;
            paymentToken.safeTransfer(recipients[i].recipient, recipientAmount);
            splitRecipients[paymentId].push(recipients[i]);
        }

        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            paymentType: PaymentType.SPLIT,
            totalAmount: totalAmount,
            releasedAmount: totalAmount,
            createdAt: block.timestamp,
            completedAt: block.timestamp,
            isCompleted: true,
            isCancelled: false
        });

        userPayments[msg.sender].push(paymentId);
        totalPaymentsProcessed++;
        totalVolumeProcessed += totalAmount;

        emit SplitPaymentExecuted(paymentId, recipients.length, totalAmount);
        emit PaymentCreated(paymentId, msg.sender, PaymentType.SPLIT, totalAmount);
    }

    /**
     * @notice Create a streaming payment
     */
    function createStreamingPayment(
        address recipient,
        uint256 totalAmount,
        uint256 duration
    ) external nonReentrant returns (bytes32 paymentId) {
        require(recipient != address(0), "Invalid recipient");
        require(totalAmount > 0, "Amount must be positive");
        require(duration > 0, "Duration must be positive");

        paymentId = keccak256(abi.encodePacked(msg.sender, recipient, block.timestamp, "STREAM"));

        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        streamingPayments[paymentId] = StreamingPayment({
            paymentId: paymentId,
            recipient: recipient,
            totalAmount: totalAmount,
            claimedAmount: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            lastClaimTime: block.timestamp
        });

        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            paymentType: PaymentType.STREAMING,
            totalAmount: totalAmount,
            releasedAmount: 0,
            createdAt: block.timestamp,
            completedAt: 0,
            isCompleted: false,
            isCancelled: false
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(paymentId, msg.sender, PaymentType.STREAMING, totalAmount);
    }

    /**
     * @notice Claim available streaming payment
     */
    function claimStreamingPayment(bytes32 paymentId) external nonReentrant {
        StreamingPayment storage stream = streamingPayments[paymentId];
        require(stream.recipient == msg.sender, "Not recipient");
        require(stream.claimedAmount < stream.totalAmount, "Fully claimed");

        uint256 elapsed = block.timestamp > stream.endTime 
            ? stream.endTime - stream.startTime 
            : block.timestamp - stream.startTime;
        
        uint256 totalDuration = stream.endTime - stream.startTime;
        uint256 vestedAmount = (stream.totalAmount * elapsed) / totalDuration;
        uint256 claimable = vestedAmount - stream.claimedAmount;

        require(claimable > 0, "Nothing to claim");

        stream.claimedAmount += claimable;
        stream.lastClaimTime = block.timestamp;

        payments[paymentId].releasedAmount = stream.claimedAmount;

        if (stream.claimedAmount >= stream.totalAmount) {
            payments[paymentId].isCompleted = true;
            payments[paymentId].completedAt = block.timestamp;
        }

        paymentToken.safeTransfer(msg.sender, claimable);

        emit StreamPaymentClaimed(paymentId, msg.sender, claimable);
    }

    /**
     * @notice Create a conditional payment
     */
    function createConditionalPayment(
        address recipient,
        uint256 amount,
        address conditionContract,
        bytes calldata conditionData
    ) external nonReentrant returns (bytes32 paymentId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");

        paymentId = keccak256(abi.encodePacked(msg.sender, recipient, block.timestamp, "CONDITIONAL"));

        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        conditionalPayments[paymentId] = ConditionalPayment({
            paymentId: paymentId,
            recipient: recipient,
            amount: amount,
            conditionContract: conditionContract,
            conditionData: conditionData,
            isReleased: false
        });

        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            paymentType: PaymentType.CONDITIONAL,
            totalAmount: amount,
            releasedAmount: 0,
            createdAt: block.timestamp,
            completedAt: 0,
            isCompleted: false,
            isCancelled: false
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(paymentId, msg.sender, PaymentType.CONDITIONAL, amount);
    }

    /**
     * @notice Release conditional payment if condition is met
     */
    function releaseConditionalPayment(bytes32 paymentId) external nonReentrant {
        ConditionalPayment storage condPayment = conditionalPayments[paymentId];
        require(!condPayment.isReleased, "Already released");

        // Check condition
        if (condPayment.conditionContract != address(0)) {
            (bool success, bytes memory result) = condPayment.conditionContract.staticcall(condPayment.conditionData);
            require(success && abi.decode(result, (bool)), "Condition not met");
        }

        condPayment.isReleased = true;
        payments[paymentId].releasedAmount = condPayment.amount;
        payments[paymentId].isCompleted = true;
        payments[paymentId].completedAt = block.timestamp;

        paymentToken.safeTransfer(condPayment.recipient, condPayment.amount);
        totalVolumeProcessed += condPayment.amount;

        emit ConditionalPaymentReleased(paymentId, condPayment.recipient, condPayment.amount);
    }

    /**
     * @notice Create a recurring payment subscription
     */
    function createRecurringPayment(
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 totalPayments
    ) external nonReentrant returns (bytes32 paymentId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0 && interval > 0 && totalPayments > 0, "Invalid parameters");

        paymentId = keccak256(abi.encodePacked(msg.sender, recipient, block.timestamp, "RECURRING"));

        // Deposit full amount upfront
        uint256 fullAmount = amount * totalPayments;
        paymentToken.safeTransferFrom(msg.sender, address(this), fullAmount);

        recurringPayments[paymentId] = RecurringPayment({
            id: paymentId,
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            interval: interval,
            nextPaymentTime: block.timestamp,
            totalPayments: totalPayments,
            completedPayments: 0,
            isActive: true
        });

        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            paymentType: PaymentType.RECURRING,
            totalAmount: fullAmount,
            releasedAmount: 0,
            createdAt: block.timestamp,
            completedAt: 0,
            isCompleted: false,
            isCancelled: false
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(paymentId, msg.sender, PaymentType.RECURRING, fullAmount);
    }

    /**
     * @notice Execute due recurring payment
     */
    function executeRecurringPayment(bytes32 paymentId) external nonReentrant {
        RecurringPayment storage recurring = recurringPayments[paymentId];
        require(recurring.isActive, "Not active");
        require(block.timestamp >= recurring.nextPaymentTime, "Not yet due");
        require(recurring.completedPayments < recurring.totalPayments, "All payments completed");

        paymentToken.safeTransfer(recurring.recipient, recurring.amount);
        
        recurring.completedPayments++;
        recurring.nextPaymentTime = block.timestamp + recurring.interval;
        
        payments[paymentId].releasedAmount += recurring.amount;
        totalVolumeProcessed += recurring.amount;

        if (recurring.completedPayments >= recurring.totalPayments) {
            recurring.isActive = false;
            payments[paymentId].isCompleted = true;
            payments[paymentId].completedAt = block.timestamp;
        }

        emit RecurringPaymentExecuted(paymentId, recurring.completedPayments);
    }

    /**
     * @notice Cancel a payment and refund remaining amount
     */
    function cancelPayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.payer == msg.sender, "Not payer");
        require(!payment.isCompleted && !payment.isCancelled, "Cannot cancel");

        uint256 refundAmount = payment.totalAmount - payment.releasedAmount;
        
        payment.isCancelled = true;
        payment.completedAt = block.timestamp;

        if (refundAmount > 0) {
            paymentToken.safeTransfer(msg.sender, refundAmount);
        }

        // Deactivate recurring if applicable
        if (payment.paymentType == PaymentType.RECURRING) {
            recurringPayments[paymentId].isActive = false;
        }

        emit PaymentCancelled(paymentId);
    }

    // View functions
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    function getStreamingPayment(bytes32 paymentId) external view returns (StreamingPayment memory) {
        return streamingPayments[paymentId];
    }

    function getRecurringPayment(bytes32 paymentId) external view returns (RecurringPayment memory) {
        return recurringPayments[paymentId];
    }

    function getUserPayments(address user) external view returns (bytes32[] memory) {
        return userPayments[user];
    }

    function getClaimableAmount(bytes32 paymentId) external view returns (uint256) {
        StreamingPayment storage stream = streamingPayments[paymentId];
        if (stream.recipient == address(0)) return 0;

        uint256 elapsed = block.timestamp > stream.endTime 
            ? stream.endTime - stream.startTime 
            : block.timestamp - stream.startTime;
        
        uint256 totalDuration = stream.endTime - stream.startTime;
        uint256 vestedAmount = (stream.totalAmount * elapsed) / totalDuration;
        return vestedAmount - stream.claimedAmount;
    }

    function getStats() external view returns (uint256, uint256) {
        return (totalPaymentsProcessed, totalVolumeProcessed);
    }
}
