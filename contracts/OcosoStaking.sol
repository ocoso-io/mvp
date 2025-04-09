// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OcosoStaking is Ownable, ReentrancyGuard {
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    // Staking parameters
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10**18; // 1000 tokens
    uint256 public constant MAX_STAKE_AMOUNT = 1000000 * 10**18; // 1M tokens
    uint256 public constant STAKING_PERIOD = 30 days;
    uint256 public constant REWARD_RATE = 10; // 10% APY

    // Staking struct
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastRewardTime;
        bool isActive;
    }

    // User stakes
    mapping(address => Stake) public stakes;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address _stakingToken, address _rewardToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(amount <= MAX_STAKE_AMOUNT, "Amount above maximum");
        require(stakes[msg.sender].amount == 0, "Already staking");

        // Transfer tokens from user
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Create new stake
        stakes[msg.sender] = Stake({
            amount: amount,
            startTime: block.timestamp,
            lastRewardTime: block.timestamp,
            isActive: true
        });

        emit Staked(msg.sender, amount);
    }

    function unstake() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "No active stake");
        require(block.timestamp >= userStake.startTime + STAKING_PERIOD, "Staking period not ended");

        // Calculate and transfer rewards
        uint256 reward = calculateReward(msg.sender);
        if (reward > 0) {
            require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");
            emit RewardClaimed(msg.sender, reward);
        }

        // Return staked tokens
        require(stakingToken.transfer(msg.sender, userStake.amount), "Stake return failed");
        
        // Reset stake
        userStake.isActive = false;
        emit Unstaked(msg.sender, userStake.amount);
    }

    function claimReward() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "No active stake");

        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards available");

        userStake.lastRewardTime = block.timestamp;
        require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    function calculateReward(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (!userStake.isActive) return 0;

        uint256 timeStaked = block.timestamp - userStake.lastRewardTime;
        uint256 reward = (userStake.amount * REWARD_RATE * timeStaked) / (365 days * 100);
        return reward;
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastRewardTime,
        bool isActive,
        uint256 pendingReward
    ) {
        Stake memory userStake = stakes[user];
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastRewardTime,
            userStake.isActive,
            calculateReward(user)
        );
    }
} 