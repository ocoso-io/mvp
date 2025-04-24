// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OcosoToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    struct Stake {
        uint256 amount;
        uint256 lastClaim;
    }

    struct VestingInfo {
        uint256 totalAmount;
        uint256 releaseTime;
    }

    mapping(address => Stake) public stakes;
    mapping(address => VestingInfo) public vestings;

    uint256 public totalStaked;
    uint256 public rewardRate; // Tokens/sec/token

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event RewardRateChanged(uint256 newRate);
    event VestingSet(address indexed user, uint256 amount, uint256 releaseTime);

    constructor() ERC20("Ocoso Token", "OCO") {
        _mint(msg.sender, 200_000_000 * 10 ** decimals());
        rewardRate = 11574074074074; // ca. 0.1 %/Tag
    }

    // Owner darf neue Token minten
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // Owner kann Reward-Rate anpassen
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
        emit RewardRateChanged(newRate);
    }

    // --- STAKING ---

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount = 0");
        _claimRewards(msg.sender);

        _transfer(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].lastClaim = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount = 0");
        require(stakes[msg.sender].amount >= amount, "Not enough staked");

        _claimRewards(msg.sender);

        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    function _claimRewards(address user) internal {
        uint256 reward = calculateRewards(user);
        if (reward > 0) {
            _mint(user, reward);
            emit RewardsClaimed(user, reward);
        }
        stakes[user].lastClaim = block.timestamp;
    }

    function calculateRewards(address user) public view returns (uint256) {
        Stake memory s = stakes[user];
        if (s.amount == 0) return 0;
        uint256 timeElapsed = block.timestamp - s.lastClaim;
        return (s.amount * rewardRate * timeElapsed) / 1e18;
    }

    // --- VESTING ---

    function setVesting(address user, uint256 amount, uint256 releaseTime) external onlyOwner {
        require(releaseTime > block.timestamp, "releaseTime must be in future");
        vestings[user] = VestingInfo(amount, releaseTime);
        emit VestingSet(user, amount, releaseTime);
    }

    function getLockedAmount(address user) public view returns (uint256) {
        VestingInfo memory v = vestings[user];
        if (block.timestamp >= v.releaseTime) {
            return 0;
        }
        return v.totalAmount;
    }

    // --- TRANSFER OVERRIDE ---

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);

        if (from != address(0)) {
            uint256 locked = getLockedAmount(from);
            uint256 available = balanceOf(from) - locked;
            require(available >= amount, "Amount exceeds unlocked tokens");
        }
    }
}
