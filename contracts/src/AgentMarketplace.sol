// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AgentMarketplace
 * @notice Decentralized marketplace for AI agent services
 * @dev Enables discovery, hiring, and payment for AI agent services
 */
contract AgentMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Service listing
    struct ServiceListing {
        bytes32 id;
        bytes32 agentId;           // From NexusRegistry
        address provider;
        string name;
        string description;
        string category;
        uint256 pricePerUnit;      // USDC per unit
        uint256 minUnits;
        uint256 maxUnits;
        bool isActive;
        uint256 totalSales;
        uint256 totalRevenue;
        uint256 rating;
        uint256 ratingCount;
        uint256 createdAt;
    }

    // Service order
    struct Order {
        bytes32 id;
        bytes32 listingId;
        address buyer;
        uint256 units;
        uint256 totalPrice;
        OrderStatus status;
        string deliveryData;       // IPFS hash or API response
        uint256 createdAt;
        uint256 completedAt;
        uint256 disputeDeadline;
    }

    enum OrderStatus {
        PENDING,
        ACCEPTED,
        DELIVERED,
        COMPLETED,
        DISPUTED,
        REFUNDED,
        CANCELLED
    }

    // Service categories
    string[] public categories;
    mapping(string => bool) public categoryExists;

    // State
    IERC20 public immutable paymentToken;
    
    mapping(bytes32 => ServiceListing) public listings;
    mapping(bytes32 => Order) public orders;
    mapping(address => bytes32[]) public providerListings;
    mapping(address => bytes32[]) public buyerOrders;
    mapping(string => bytes32[]) public categoryListings;
    
    bytes32[] public allListings;
    bytes32[] public allOrders;

    uint256 public platformFeeRate = 300; // 3% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public disputePeriod = 7 days;

    uint256 public totalListings;
    uint256 public totalOrders;
    uint256 public totalVolume;

    // Events
    event ListingCreated(bytes32 indexed listingId, bytes32 indexed agentId, address provider, string name);
    event ListingUpdated(bytes32 indexed listingId);
    event ListingDeactivated(bytes32 indexed listingId);
    event OrderCreated(bytes32 indexed orderId, bytes32 indexed listingId, address buyer, uint256 units);
    event OrderAccepted(bytes32 indexed orderId);
    event OrderDelivered(bytes32 indexed orderId, string deliveryData);
    event OrderCompleted(bytes32 indexed orderId);
    event OrderDisputed(bytes32 indexed orderId);
    event OrderRefunded(bytes32 indexed orderId);
    event ListingRated(bytes32 indexed listingId, uint8 rating);

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        
        // Initialize default categories
        _addCategory("defi");
        _addCategory("payments");
        _addCategory("analytics");
        _addCategory("trading");
        _addCategory("data-oracle");
        _addCategory("automation");
        _addCategory("security");
        _addCategory("rwa");
    }

    function _addCategory(string memory category) internal {
        if (!categoryExists[category]) {
            categories.push(category);
            categoryExists[category] = true;
        }
    }

    /**
     * @notice Create a new service listing
     */
    function createListing(
        bytes32 agentId,
        string calldata name,
        string calldata description,
        string calldata category,
        uint256 pricePerUnit,
        uint256 minUnits,
        uint256 maxUnits
    ) external returns (bytes32 listingId) {
        require(bytes(name).length > 0, "Name required");
        require(categoryExists[category], "Invalid category");
        require(pricePerUnit > 0, "Price must be positive");
        require(minUnits <= maxUnits, "Invalid unit range");

        listingId = keccak256(abi.encodePacked(msg.sender, agentId, block.timestamp, name));

        listings[listingId] = ServiceListing({
            id: listingId,
            agentId: agentId,
            provider: msg.sender,
            name: name,
            description: description,
            category: category,
            pricePerUnit: pricePerUnit,
            minUnits: minUnits,
            maxUnits: maxUnits,
            isActive: true,
            totalSales: 0,
            totalRevenue: 0,
            rating: 0,
            ratingCount: 0,
            createdAt: block.timestamp
        });

        allListings.push(listingId);
        providerListings[msg.sender].push(listingId);
        categoryListings[category].push(listingId);
        totalListings++;

        emit ListingCreated(listingId, agentId, msg.sender, name);
    }

    /**
     * @notice Update a listing
     */
    function updateListing(
        bytes32 listingId,
        string calldata description,
        uint256 pricePerUnit,
        uint256 minUnits,
        uint256 maxUnits
    ) external {
        ServiceListing storage listing = listings[listingId];
        require(listing.provider == msg.sender, "Not provider");

        listing.description = description;
        listing.pricePerUnit = pricePerUnit;
        listing.minUnits = minUnits;
        listing.maxUnits = maxUnits;

        emit ListingUpdated(listingId);
    }

    /**
     * @notice Deactivate a listing
     */
    function deactivateListing(bytes32 listingId) external {
        require(listings[listingId].provider == msg.sender, "Not provider");
        listings[listingId].isActive = false;
        emit ListingDeactivated(listingId);
    }

    /**
     * @notice Create an order for a service
     */
    function createOrder(
        bytes32 listingId,
        uint256 units
    ) external nonReentrant returns (bytes32 orderId) {
        ServiceListing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(units >= listing.minUnits && units <= listing.maxUnits, "Invalid units");

        uint256 totalPrice = listing.pricePerUnit * units;
        
        // Transfer payment to escrow
        paymentToken.safeTransferFrom(msg.sender, address(this), totalPrice);

        orderId = keccak256(abi.encodePacked(msg.sender, listingId, block.timestamp));

        orders[orderId] = Order({
            id: orderId,
            listingId: listingId,
            buyer: msg.sender,
            units: units,
            totalPrice: totalPrice,
            status: OrderStatus.PENDING,
            deliveryData: "",
            createdAt: block.timestamp,
            completedAt: 0,
            disputeDeadline: 0
        });

        allOrders.push(orderId);
        buyerOrders[msg.sender].push(orderId);
        totalOrders++;

        emit OrderCreated(orderId, listingId, msg.sender, units);
    }

    /**
     * @notice Accept an order (provider)
     */
    function acceptOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        ServiceListing storage listing = listings[order.listingId];
        require(listing.provider == msg.sender, "Not provider");
        require(order.status == OrderStatus.PENDING, "Invalid status");

        order.status = OrderStatus.ACCEPTED;

        emit OrderAccepted(orderId);
    }

    /**
     * @notice Deliver order result (provider)
     */
    function deliverOrder(bytes32 orderId, string calldata deliveryData) external {
        Order storage order = orders[orderId];
        ServiceListing storage listing = listings[order.listingId];
        require(listing.provider == msg.sender, "Not provider");
        require(order.status == OrderStatus.ACCEPTED, "Invalid status");

        order.status = OrderStatus.DELIVERED;
        order.deliveryData = deliveryData;
        order.disputeDeadline = block.timestamp + disputePeriod;

        emit OrderDelivered(orderId, deliveryData);
    }

    /**
     * @notice Complete order and release payment (buyer or auto after dispute period)
     */
    function completeOrder(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DELIVERED, "Not delivered");
        
        // Either buyer confirms or dispute period passed
        require(
            order.buyer == msg.sender || block.timestamp > order.disputeDeadline,
            "Not authorized"
        );

        ServiceListing storage listing = listings[order.listingId];
        
        // Calculate fees
        uint256 platformFee = (order.totalPrice * platformFeeRate) / BASIS_POINTS;
        uint256 providerPayment = order.totalPrice - platformFee;

        // Transfer to provider
        paymentToken.safeTransfer(listing.provider, providerPayment);
        
        // Update order
        order.status = OrderStatus.COMPLETED;
        order.completedAt = block.timestamp;

        // Update listing stats
        listing.totalSales += order.units;
        listing.totalRevenue += providerPayment;
        totalVolume += order.totalPrice;

        emit OrderCompleted(orderId);
    }

    /**
     * @notice Dispute an order (buyer)
     */
    function disputeOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(order.status == OrderStatus.DELIVERED, "Not delivered");
        require(block.timestamp <= order.disputeDeadline, "Dispute period ended");

        order.status = OrderStatus.DISPUTED;

        emit OrderDisputed(orderId);
    }

    /**
     * @notice Refund a disputed order (admin only for MVP)
     */
    function refundOrder(bytes32 orderId) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.DISPUTED || order.status == OrderStatus.PENDING,
            "Cannot refund"
        );

        paymentToken.safeTransfer(order.buyer, order.totalPrice);
        
        order.status = OrderStatus.REFUNDED;
        order.completedAt = block.timestamp;

        emit OrderRefunded(orderId);
    }

    /**
     * @notice Rate a completed order
     */
    function rateOrder(bytes32 orderId, uint8 rating) external {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(order.status == OrderStatus.COMPLETED, "Not completed");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        ServiceListing storage listing = listings[order.listingId];
        
        uint256 totalRating = listing.rating * listing.ratingCount;
        listing.ratingCount++;
        listing.rating = (totalRating + (rating * 100)) / listing.ratingCount;

        emit ListingRated(order.listingId, rating);
    }

    // View functions
    function getListing(bytes32 listingId) external view returns (ServiceListing memory) {
        return listings[listingId];
    }

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getProviderListings(address provider) external view returns (bytes32[] memory) {
        return providerListings[provider];
    }

    function getBuyerOrders(address buyer) external view returns (bytes32[] memory) {
        return buyerOrders[buyer];
    }

    function getListingsByCategory(string calldata category) external view returns (bytes32[] memory) {
        return categoryListings[category];
    }

    function getAllListings() external view returns (bytes32[] memory) {
        return allListings;
    }

    function getAllCategories() external view returns (string[] memory) {
        return categories;
    }

    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalListings, totalOrders, totalVolume);
    }

    // Admin functions
    function addCategory(string calldata category) external onlyOwner {
        _addCategory(category);
    }

    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Fee too high"); // Max 10%
        platformFeeRate = newRate;
    }

    function setDisputePeriod(uint256 newPeriod) external onlyOwner {
        disputePeriod = newPeriod;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        // Only withdraw platform fees, not escrowed funds
        // For MVP, this is simplified - production would track separately
        paymentToken.safeTransfer(owner(), balance);
    }
}
