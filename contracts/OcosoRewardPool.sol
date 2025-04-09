// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract OcosoRewardPool is ReentrancyGuard, AccessControl {
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    
    // Contract addresses
    IERC721 public immutable nftContract;
    IERC20 public immutable rewardToken;
    
    // Staking configuration
    uint256 public constant MIN_STAKING_PERIOD = 7 days;
    uint256 public constant MAX_STAKING_PERIOD = 365 days;
    uint256 public constant REWARD_MULTIPLIER = 100; // 1% per day
    
    struct StakingPosition {
        address owner;
        uint256[] tokenIds;
        uint256 startTime;
        uint256 endTime;
        uint256 lastClaimTime;
        uint256 totalRewards;
        bool isActive;
    }

    // Mapping from position ID to staking details
    mapping(uint256 => StakingPosition) public stakingPositions;
    
    // Mapping from user address to their position IDs
    mapping(address => uint256[]) public userPositions;
    
    // Mapping from NFT ID to position ID
    mapping(uint256 => uint256) public nftToPosition;
    
    // Total staked NFTs
    uint256 public totalStakedNFTs;
    
    // Next position ID
    uint256 private nextPositionId;
    
    // Events
    event PositionCreated(address indexed user, uint256 indexed positionId, uint256[] tokenIds);
    event PositionClosed(address indexed user, uint256 indexed positionId);
    event RewardsClaimed(address indexed user, uint256 indexed positionId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed positionId);
    event RewardAdded(uint256 amount);

    constructor(address _nftContract, address _rewardToken) {
        nftContract = IERC721(_nftContract);
        rewardToken = IERC20(_rewardToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REWARD_MANAGER_ROLE, msg.sender);
    }

    // Function to create a new staking position
    function createPosition(uint256[] calldata tokenIds, uint256 stakingPeriod) external nonReentrant {
        require(tokenIds.length > 0, "No NFTs provided");
        require(stakingPeriod >= MIN_STAKING_PERIOD && stakingPeriod <= MAX_STAKING_PERIOD, "Invalid staking period");
        
        uint256 positionId = nextPositionId++;
        
        // Transfer NFTs to contract
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(nftContract.ownerOf(tokenIds[i]) == msg.sender, "Not NFT owner");
            nftContract.transferFrom(msg.sender, address(this), tokenIds[i]);
            nftToPosition[tokenIds[i]] = positionId;
        }
        
        stakingPositions[positionId] = StakingPosition({
            owner: msg.sender,
            tokenIds: tokenIds,
            startTime: block.timestamp,
            endTime: block.timestamp + stakingPeriod,
            lastClaimTime: block.timestamp,
            totalRewards: 0,
            isActive: true
        });
        
        userPositions[msg.sender].push(positionId);
        totalStakedNFTs += tokenIds.length;
        
        emit PositionCreated(msg.sender, positionId, tokenIds);
    }

    // Function to close a position and claim rewards
    function closePosition(uint256 positionId) external nonReentrant {
        StakingPosition storage position = stakingPositions[positionId];
        require(position.owner == msg.sender, "Not the owner");
        require(position.isActive, "Position not active");
        
        // Claim any pending rewards
        if (position.lastClaimTime < block.timestamp) {
            _claimRewards(positionId);
        }
        
        // Return NFTs to owner
        for (uint256 i = 0; i < position.tokenIds.length; i++) {
            nftContract.transferFrom(address(this), msg.sender, position.tokenIds[i]);
            delete nftToPosition[position.tokenIds[i]];
        }
        
        totalStakedNFTs -= position.tokenIds.length;
        position.isActive = false;
        
        // Remove position from user's positions
        uint256[] storage userPos = userPositions[msg.sender];
        for (uint256 i = 0; i < userPos.length; i++) {
            if (userPos[i] == positionId) {
                userPos[i] = userPos[userPos.length - 1];
                userPos.pop();
                break;
            }
        }
        
        emit PositionClosed(msg.sender, positionId);
    }

    // Function to claim rewards
    function claimRewards(uint256 positionId) external nonReentrant {
        StakingPosition storage position = stakingPositions[positionId];
        require(position.owner == msg.sender, "Not the owner");
        require(position.isActive, "Position not active");
        _claimRewards(positionId);
    }

    // Internal function to handle reward claiming
    function _claimRewards(uint256 positionId) internal {
        StakingPosition storage position = stakingPositions[positionId];
        uint256 rewards = calculateRewards(positionId);
        
        if (rewards > 0) {
            position.lastClaimTime = block.timestamp;
            position.totalRewards += rewards;
            require(rewardToken.transfer(position.owner, rewards), "Reward transfer failed");
            emit RewardsClaimed(position.owner, positionId, rewards);
        }
    }

    // Function to calculate pending rewards
    function calculateRewards(uint256 positionId) public view returns (uint256) {
        StakingPosition memory position = stakingPositions[positionId];
        if (!position.isActive) return 0;
        
        uint256 timeStaked = block.timestamp - position.lastClaimTime;
        if (timeStaked == 0) return 0;
        
        // Calculate rewards based on number of NFTs and time staked
        uint256 dailyReward = position.tokenIds.length * REWARD_MULTIPLIER;
        return (dailyReward * timeStaked) / 1 days;
    }

    // Function to add rewards to the pool
    function addRewards(uint256 amount) external onlyRole(REWARD_MANAGER_ROLE) {
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit RewardAdded(amount);
    }

    // Function to get all positions for a user
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    // Function to get position details
    function getPositionDetails(uint256 positionId) external view returns (
        address owner,
        uint256[] memory tokenIds,
        uint256 startTime,
        uint256 endTime,
        uint256 lastClaimTime,
        uint256 totalRewards,
        bool isActive,
        uint256 pendingRewards
    ) {
        StakingPosition memory position = stakingPositions[positionId];
        return (
            position.owner,
            position.tokenIds,
            position.startTime,
            position.endTime,
            position.lastClaimTime,
            position.totalRewards,
            position.isActive,
            calculateRewards(positionId)
        );
    }

    // Emergency withdraw function (admin only)
    function emergencyWithdraw(uint256 positionId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        StakingPosition storage position = stakingPositions[positionId];
        require(position.isActive, "Position not active");
        
        // Return NFTs to owner
        for (uint256 i = 0; i < position.tokenIds.length; i++) {
            nftContract.transferFrom(address(this), position.owner, position.tokenIds[i]);
            delete nftToPosition[position.tokenIds[i]];
        }
        
        totalStakedNFTs -= position.tokenIds.length;
        position.isActive = false;
        
        emit EmergencyWithdraw(position.owner, positionId);
    }
} 