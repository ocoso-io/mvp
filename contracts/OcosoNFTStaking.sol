// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OcosoNFTStaking is ReentrancyGuard, Ownable {
    IERC721 public nftContract;
    IERC20 public rewardToken;
    
    // Reward rate: 10 OCOSO tokens per NFT per day
    uint256 public constant REWARD_RATE = 10 * 1e18;
    uint256 public constant REWARD_INTERVAL = 1 days;

    struct StakedNFT {
        address owner;
        uint256 tokenId;
        uint256 stakedAt;
        uint256 lastClaimed;
    }

    // Mapping from token ID to staking details
    mapping(uint256 => StakedNFT) public stakedNFTs;
    
    // Mapping from user address to their staked token IDs
    mapping(address => uint256[]) public userStakedTokens;

    event NFTStaked(address indexed user, uint256 indexed tokenId);
    event NFTUnstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _nftContract, address _rewardToken) {
        nftContract = IERC721(_nftContract);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 tokenId) external nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(stakedNFTs[tokenId].owner == address(0), "Already staked");

        nftContract.transferFrom(msg.sender, address(this), tokenId);

        stakedNFTs[tokenId] = StakedNFT({
            owner: msg.sender,
            tokenId: tokenId,
            stakedAt: block.timestamp,
            lastClaimed: block.timestamp
        });

        userStakedTokens[msg.sender].push(tokenId);
        emit NFTStaked(msg.sender, tokenId);
    }

    function unstake(uint256 tokenId) external nonReentrant {
        StakedNFT memory staked = stakedNFTs[tokenId];
        require(staked.owner == msg.sender, "Not the staker");

        _claimRewards(tokenId);

        nftContract.transferFrom(address(this), msg.sender, tokenId);
        delete stakedNFTs[tokenId];

        // Remove tokenId from user's staked tokens array
        uint256[] storage userTokens = userStakedTokens[msg.sender];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }

        emit NFTUnstaked(msg.sender, tokenId);
    }

    function claimRewards(uint256 tokenId) external nonReentrant {
        require(stakedNFTs[tokenId].owner == msg.sender, "Not the staker");
        _claimRewards(tokenId);
    }

    function _claimRewards(uint256 tokenId) internal {
        StakedNFT storage staked = stakedNFTs[tokenId];
        uint256 reward = calculateRewards(tokenId);
        
        if (reward > 0) {
            staked.lastClaimed = block.timestamp;
            require(rewardToken.transfer(staked.owner, reward), "Transfer failed");
            emit RewardsClaimed(staked.owner, reward);
        }
    }

    function calculateRewards(uint256 tokenId) public view returns (uint256) {
        StakedNFT memory staked = stakedNFTs[tokenId];
        if (staked.owner == address(0)) return 0;

        uint256 timeStaked = block.timestamp - staked.lastClaimed;
        uint256 daysStaked = timeStaked / REWARD_INTERVAL;
        
        return daysStaked * REWARD_RATE;
    }

    function getStakedNFTs(address user) external view returns (uint256[] memory) {
        return userStakedTokens[user];
    }

    function getStakingInfo(uint256 tokenId) external view returns (
        address owner,
        uint256 stakedAt,
        uint256 lastClaimed,
        uint256 pendingRewards
    ) {
        StakedNFT memory staked = stakedNFTs[tokenId];
        return (
            staked.owner,
            staked.stakedAt,
            staked.lastClaimed,
            calculateRewards(tokenId)
        );
    }
} 