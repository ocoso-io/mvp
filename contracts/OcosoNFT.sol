// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OcosoNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Content visibility settings
    enum Visibility { Public, Private, TokenGated }
    mapping(uint256 => Visibility) private _tokenVisibility;
    
    // Content metadata
    struct ContentMetadata {
        string title;
        string[] tags;
        string[] topics;
        uint256 createdAt;
        address creator;
    }
    mapping(uint256 => ContentMetadata) private _contentMetadata;

    // Events
    event ContentMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string title,
        Visibility visibility
    );

    constructor() ERC721("OCOSO Content", "OCOSO") Ownable(msg.sender) {}

    function mintContent(
        string memory title,
        string[] memory tags,
        string[] memory topics,
        string memory tokenURI,
        Visibility visibility
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _tokenVisibility[newTokenId] = visibility;

        _contentMetadata[newTokenId] = ContentMetadata({
            title: title,
            tags: tags,
            topics: topics,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        emit ContentMinted(newTokenId, msg.sender, title, visibility);
        return newTokenId;
    }

    function getContentMetadata(uint256 tokenId) public view returns (
        string memory title,
        string[] memory tags,
        string[] memory topics,
        uint256 createdAt,
        address creator,
        Visibility visibility
    ) {
        require(_exists(tokenId), "Token does not exist");
        ContentMetadata memory metadata = _contentMetadata[tokenId];
        return (
            metadata.title,
            metadata.tags,
            metadata.topics,
            metadata.createdAt,
            metadata.creator,
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