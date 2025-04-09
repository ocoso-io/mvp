// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OcosoMintNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Content types
    enum ContentType { Image, Video, Audio, Document, Other }
    
    // Content metadata
    struct ContentMetadata {
        string title;
        string description;
        ContentType contentType;
        string fileHash; // IPFS hash of the content
        string fileType; // MIME type of the content
        uint256 fileSize; // Size in bytes
        string[] tags;
        string[] topics;
        uint256 createdAt;
        address creator;
        bool isExplicit;
    }

    // Content visibility settings
    enum Visibility { Public, Private, TokenGated }
    
    // Mapping from token ID to content metadata
    mapping(uint256 => ContentMetadata) private _contentMetadata;
    // Mapping from token ID to visibility
    mapping(uint256 => Visibility) private _tokenVisibility;
    
    // Events
    event ContentUploaded(
        uint256 indexed tokenId,
        address indexed creator,
        string title,
        ContentType contentType,
        string fileHash,
        Visibility visibility
    );

    constructor() ERC721("OCOSO Content", "OCOSO") Ownable(msg.sender) {}

    function uploadContent(
        string memory title,
        string memory description,
        ContentType contentType,
        string memory fileHash,
        string memory fileType,
        uint256 fileSize,
        string[] memory tags,
        string[] memory topics,
        bool isExplicit,
        Visibility visibility
    ) public returns (uint256) {
        require(bytes(fileHash).length > 0, "File hash cannot be empty");
        require(fileSize > 0, "File size must be greater than 0");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        
        // Create metadata URI
        string memory tokenURI = string(abi.encodePacked("ipfs://", fileHash));
        _setTokenURI(newTokenId, tokenURI);
        
        // Store content metadata
        _contentMetadata[newTokenId] = ContentMetadata({
            title: title,
            description: description,
            contentType: contentType,
            fileHash: fileHash,
            fileType: fileType,
            fileSize: fileSize,
            tags: tags,
            topics: topics,
            createdAt: block.timestamp,
            creator: msg.sender,
            isExplicit: isExplicit
        });

        _tokenVisibility[newTokenId] = visibility;

        emit ContentUploaded(
            newTokenId,
            msg.sender,
            title,
            contentType,
            fileHash,
            visibility
        );

        return newTokenId;
    }

    function getContentMetadata(uint256 tokenId) public view returns (
        string memory title,
        string memory description,
        ContentType contentType,
        string memory fileHash,
        string memory fileType,
        uint256 fileSize,
        string[] memory tags,
        string[] memory topics,
        uint256 createdAt,
        address creator,
        bool isExplicit,
        Visibility visibility
    ) {
        require(_exists(tokenId), "Token does not exist");
        ContentMetadata memory metadata = _contentMetadata[tokenId];
        return (
            metadata.title,
            metadata.description,
            metadata.contentType,
            metadata.fileHash,
            metadata.fileType,
            metadata.fileSize,
            metadata.tags,
            metadata.topics,
            metadata.createdAt,
            metadata.creator,
            metadata.isExplicit,
            _tokenVisibility[tokenId]
        );
    }

    function setVisibility(uint256 tokenId, Visibility visibility) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _tokenVisibility[tokenId] = visibility;
    }

    // Override required functions
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 