// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract OcosoNFT is ERC721URIStorage, IERC2981, Ownable, ReentrancyGuard {
    uint256 public nextTokenId;
    uint256 public mintFee = 0.01 ether;
    bool public mintingEnabled = true;

    struct NFTData {
        string category;
        string name;
        string[] tags;
        string contentLink;
        string onchainText; // optional – für Text NFTs
    }

    mapping(uint256 => NFTData) public nftData;

    // Royalties
    address public royaltyReceiver;
    uint96 public royaltyFeeBasisPoints = 500; // 5%

    event NFTMinted(address indexed to, uint256 indexed tokenId, string category, string name);

    constructor() ERC721("Ocoso NFT", "ocNFT") {
        royaltyReceiver = msg.sender;
    }

    modifier mintingAllowed() {
        require(mintingEnabled, "Minting is disabled");
        _;
    }

    function mintNFT(
        string memory category,
        string memory name,
        string[] memory tags,
        string memory contentLink,
        string memory onchainText,
        string memory tokenURI
    ) external payable nonReentrant mintingAllowed {
        require(msg.value >= mintFee, "Insufficient ETH for minting");

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        nftData[tokenId] = NFTData({
            category: category,
            name: name,
            tags: tags,
            contentLink: contentLink,
            onchainText: onchainText
        });

        emit NFTMinted(msg.sender, tokenId, category, name);
    }

    // --- Royalties (EIP-2981) ---
    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        royaltyAmount = (salePrice * royaltyFeeBasisPoints) / 10000;
        return (royaltyReceiver, royaltyAmount);
    }

    // --- Admin Controls ---

    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
    }

    function setMintFee(uint256 feeInWei) external onlyOwner {
        mintFee = feeInWei;
    }

    function setRoyaltyInfo(address receiver, uint96 feeBasisPoints) external onlyOwner {
        require(feeBasisPoints <= 1000, "Max 10%");
        royaltyReceiver = receiver;
        royaltyFeeBasisPoints = feeBasisPoints;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // --- View Functions ---

    function getTags(uint256 tokenId) external view returns (string[] memory) {
        return nftData[tokenId].tags;
    }

    function getNFTDetails(uint256 tokenId) external view returns (NFTData memory) {
        return nftData[tokenId];
    }

    // --- Interface Support ---

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721URIStorage, IERC165)
    returns (bool)
    {
    return
        interfaceId == type(IERC2981).interfaceId ||
        super.supportsInterface(interfaceId);
    }

}
