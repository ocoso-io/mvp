// Minting functionality for OcosoMintNFT
const updateStatus = (message, type = 'info') => {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = type; // success, error, or info
    }
};

const mintNFT = async () => {
    try {
        updateStatus('Überprüfe MetaMask...', 'info');
        
        // Check if MetaMask is connected
        if (!window.ethereum) {
            updateStatus('Bitte installiere MetaMask, um NFTs zu minten', 'error');
            return;
        }

        updateStatus('Verbinde mit Wallet...', 'info');
        
        // Get the contract instance
        const contractAddress = 'YOUR_CONTRACT_ADDRESS'; // Replace with deployed contract address
        const contractABI = [
            // Add your contract ABI here
        ];
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        updateStatus('Bereite NFT-Daten vor...', 'info');

        // Get form data
        const title = document.querySelector('input[name="title"]')?.value;
        const description = document.querySelector('textarea[name="description"]')?.value;
        const file = document.querySelector('input[type="file"]')?.files[0];

        if (!title || !description || !file) {
            updateStatus('Bitte fülle alle Felder aus', 'error');
            return;
        }

        updateStatus('Lade Datei auf IPFS hoch...', 'info');

        // Upload file to IPFS
        const formData = new FormData();
        formData.append('file', file);

        const ipfsResponse = await fetch('YOUR_IPFS_API_ENDPOINT', {
            method: 'POST',
            body: formData
        });
        const ipfsData = await ipfsResponse.json();
        const ipfsHash = ipfsData.Hash;

        updateStatus('Minte NFT...', 'info');

        // Call the smart contract
        const tx = await contract.mintNFT(
            title,
            description,
            ipfsHash
        );

        updateStatus('Warte auf Transaktionsbestätigung...', 'info');

        // Wait for transaction to be mined
        await tx.wait();

        updateStatus('NFT erfolgreich geminted!', 'success');
        
        // Reset form
        document.querySelector('form')?.reset();
        
    } catch (error) {
        console.error('Error minting NFT:', error);
        updateStatus('Fehler beim Minten: ' + error.message, 'error');
    }
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateStatus('Bereit zum Starten...', 'info');
}); 