// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract CryptoStaking is ReentrancyGuard, AccessControl {
    bytes32 public constant CLAIMER_ROLE = keccak256("CLAIMER_ROLE");
    
    struct StakingPosition {
        address owner;
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 rewardRate; // Reward rate per second
    }

    // Mapping from staking position ID to staking details
    mapping(uint256 => StakingPosition) public stakingPositions;
    
    // Mapping from user address to their staking position IDs
    mapping(address => uint256[]) public userStakingPositions;
    
    // Total staked amount
    uint256 public totalStaked;
    
    // Next staking position ID
    uint256 private nextPositionId;
    
    // Events
    event PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount);
    event PositionClosed(address indexed user, uint256 indexed positionId);
    event RewardsClaimed(address indexed user, uint256 indexed positionId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed positionId, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CLAIMER_ROLE, msg.sender);
    }

    // Function to create a new staking position
    function createPosition(uint256 amount, uint256 rewardRate) external payable nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(rewardRate > 0, "Reward rate must be greater than 0");
        
        uint256 positionId = nextPositionId++;
        stakingPositions[positionId] = StakingPosition({
            owner: msg.sender,
            amount: amount,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            rewardRate: rewardRate
        });
        
        userStakingPositions[msg.sender].push(positionId);
        totalStaked += amount;
        
        emit PositionCreated(msg.sender, positionId, amount);
    }

    // Function to close a staking position and claim all rewards
    function closePosition(uint256 positionId) external nonReentrant {
        StakingPosition storage position = stakingPositions[positionId];
        require(position.owner == msg.sender, "Not the owner");
        
        uint256 rewards = calculateRewards(positionId);
        if (rewards > 0) {
            _claimRewards(positionId);
        }
        
        totalStaked -= position.amount;
        delete stakingPositions[positionId];
        
        // Remove positionId from user's positions array
        uint256[] storage userPositions = userStakingPositions[msg.sender];
        for (uint256 i = 0; i < userPositions.length; i++) {
            if (userPositions[i] == positionId) {
                userPositions[i] = userPositions[userPositions.length - 1];
                userPositions.pop();
                break;
            }
        }
        
        emit PositionClosed(msg.sender, positionId);
    }

    // Function to claim rewards from a position
    function claimRewards(uint256 positionId) external nonReentrant {
        require(stakingPositions[positionId].owner == msg.sender, "Not the owner");
        _claimRewards(positionId);
    }

    // Internal function to handle reward claiming
    function _claimRewards(uint256 positionId) internal {
        StakingPosition storage position = stakingPositions[positionId];
        uint256 rewards = calculateRewards(positionId);
        
        if (rewards > 0) {
            position.lastClaimTime = block.timestamp;
            // Transfer rewards to the position owner
            (bool success, ) = position.owner.call{value: rewards}("");
            require(success, "Reward transfer failed");
            emit RewardsClaimed(position.owner, positionId, rewards);
        }
    }

    // Function to calculate pending rewards
    function calculateRewards(uint256 positionId) public view returns (uint256) {
        StakingPosition memory position = stakingPositions[positionId];
        if (position.owner == address(0)) return 0;
        
        uint256 timeStaked = block.timestamp - position.lastClaimTime;
        return timeStaked * position.rewardRate;
    }

    // Function to get all positions for a user
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userStakingPositions[user];
    }

    // Function to get position details
    function getPositionDetails(uint256 positionId) external view returns (
        address owner,
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 rewardRate,
        uint256 pendingRewards
    ) {
        StakingPosition memory position = stakingPositions[positionId];
        return (
            position.owner,
            position.amount,
            position.startTime,
            position.lastClaimTime,
            position.rewardRate,
            calculateRewards(positionId)
        );
    }

    // Emergency withdraw function (admin only)
    function emergencyWithdraw(uint256 positionId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        StakingPosition storage position = stakingPositions[positionId];
        require(position.owner != address(0), "Position does not exist");
        
        uint256 amount = position.amount;
        totalStaked -= amount;
        delete stakingPositions[positionId];
        
        // Remove positionId from user's positions array
        uint256[] storage userPositions = userStakingPositions[position.owner];
        for (uint256 i = 0; i < userPositions.length; i++) {
            if (userPositions[i] == positionId) {
                userPositions[i] = userPositions[userPositions.length - 1];
                userPositions.pop();
                break;
            }
        }
        
        emit EmergencyWithdraw(position.owner, positionId, amount);
    }

    // Function to receive ETH
    receive() external payable {}
} 