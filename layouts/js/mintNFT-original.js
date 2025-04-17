
const CONTRACT_ADDRESS = "0xc205237602bB7ed983a65a5c87F765Ff02837066";
const CONTRACT_ABI = [
  "function mintNFT(string category,string name,string[] tags,string contentLink,string onchainText,string tokenURI) external payable",
  "function withdraw() external",
  "function owner() view returns (address)",
  "function royaltyInfo(uint256,uint256) view returns (address,uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function nftData(uint256) view returns (string category, string name, string[] tags, string contentLink, string onchainText)"
];

async function uploadAndMintNFT() {
  const apiKey = "7168ddc744fbfb8a91d0";
  const secret = "bf60b5f0116df980222e610585d90a9d0ad86987c755b3f07691fd74834499fe";
  const file = document.getElementById('fileInput').files[0];
  const name = document.getElementById('nftName').value;
  const description = document.getElementById('nftDesc').value;
  const category = document.getElementById('nftCategory').value;
  const tags = document.getElementById('nftTags').value.split(',').map(tag => tag.trim());
  const onchainText = document.getElementById('onchainText').value;

  if (!file || !name || !description || !category) {
    alert("Bitte alle Pflichtfelder ausfüllen.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const fileRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      pinata_api_key: apiKey,
      pinata_secret_api_key: secret
    }
  });

  const imageCid = fileRes.data.IpfsHash;
  const metadata = { name, description, image: `ipfs://${imageCid}` };

  const metaRes = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secret
    }
  });

  const metadataCid = metaRes.data.IpfsHash;
  const tokenURI = `ipfs://${metadataCid}`;

  if (!window.ethereum) {
    alert("MetaMask nicht gefunden");
    return;
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const tx = await contract.mintNFT(
    category,
    name,
    tags,
    `ipfs://${imageCid}`,
    onchainText,
    tokenURI,
    { value: ethers.utils.parseEther("0.01") }
  );

  document.getElementById("result").innerText = `✅ NFT minted! TX Hash: ${tx.hash}`;
}

async function withdrawFunds() {
  if (!window.ethereum) {
    alert("MetaMask nicht gefunden");
    return;
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const tx = await contract.withdraw();
  document.getElementById("result").innerText = `💸 Withdrawal sent! TX Hash: ${tx.hash}`;
}
