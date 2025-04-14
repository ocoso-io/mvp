// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OcosoToken is ERC20, Ownable, Pausable, ERC20Burnable, ERC20Permit, ReentrancyGuard {
    // Staking related variables
    struct StakingPosition {
        uint256 amount;
        uint256 startTime;
        uint256 lastRewardTime;
        uint256 rewardDebt;
    }

    mapping(address => StakingPosition) public stakingPositions;
    uint256 public totalStaked;
    uint256 public rewardRate; // Rewards per second per token
    uint256 public lastRewardUpdate;
    uint256 public constant REWARDS_UPDATE_INTERVAL = 1 days;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);

    constructor() 
        ERC20("Ocoso Token", "OCO") 
        ERC20Permit("Ocoso Token")
    {
        // Initial supply: 200,000,000 OCOSO tokens
        _mint(msg.sender, 200_000_000 * 10 ** decimals());
        
        // Initial reward rate: 0.1% per day
        rewardRate = 11574074074074; // 0.1% per day in wei
        lastRewardUpdate = block.timestamp;
    }

    function mint(address to, uint256 amount) public onlyOwner whenNotPaused {
        _mint(to, amount);
    }

    function burn(uint256 amount) public override whenNotPaused {
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override whenNotPaused {
        super.burnFrom(account, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Staking functions
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        StakingPosition storage position = stakingPositions[msg.sender];
        
        // Claim pending rewards if any
        if (position.amount > 0) {
            _claimRewards();
        }

        // Update staking position
        position.amount += amount;
        position.startTime = block.timestamp;
        position.lastRewardTime = block.timestamp;
        position.rewardDebt = 0;

        totalStaked += amount;
        _transfer(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        StakingPosition storage position = stakingPositions[msg.sender];
        require(position.amount >= amount, "Insufficient staked amount");

        // Claim pending rewards
        _claimRewards();

        // Update staking position
        position.amount -= amount;
        totalStaked -= amount;

        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant whenNotPaused {
        StakingPosition storage position = stakingPositions[msg.sender];
        require(position.amount > 0, "No staked tokens");
        _claimRewards();
    }

    function _claimRewards() internal {
        StakingPosition storage position = stakingPositions[msg.sender];
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        
        if (pendingRewards > 0) {
            position.lastRewardTime = block.timestamp;
            position.rewardDebt = 0;
            _mint(msg.sender, pendingRewards);
            emit RewardsClaimed(msg.sender, pendingRewards);
        }
    }

    function calculatePendingRewards(address user) public view returns (uint256) {
        StakingPosition storage position = stakingPositions[user];
        if (position.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - position.lastRewardTime;
        return (position.amount * rewardRate * timeElapsed) / 1e18;
    }

    function updateRewardRate(uint256 newRate) external onlyOwner {
        require(block.timestamp >= lastRewardUpdate + REWARDS_UPDATE_INTERVAL, "Too soon to update");
        rewardRate = newRate;
        lastRewardUpdate = block.timestamp;
        emit RewardRateUpdated(newRate);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override(ERC20)
    {
        if (from == address(this) || to == address(this)) {
            // Allow transfers to/from the contract for staking/unstaking
            super._beforeTokenTransfer(from, to, amount);
        } else {
            // For regular transfers, ensure the sender has enough unstaked tokens
            require(
                balanceOf(from) - stakingPositions[from].amount >= amount,
                "Insufficient unstaked balance"
            );
            super._beforeTokenTransfer(from, to, amount);
        }
    }
} 