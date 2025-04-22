// Minting functionality for OcosoMintNFT
const mintNFT = async () => {
    try {
        // Check if MetaMask is connected
        if (!window.ethereum) {
            alert('Please install MetaMask to mint NFTs');
            return;
        }

        // Get the contract instance
        const contractAddress = 'YOUR_CONTRACT_ADDRESS'; // Replace with deployed contract address
        const contractABI = [
            // Add your contract ABI here
        ];
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        // Get form data from the HTML structure
        const title = document.querySelector('.url-input-container[placeholder="Say what it is, and let it speak for itself."]').value;
        const description = document.querySelector('.url-input-container[placeholder="Paste the URL that proves you were first here."]').value;
        const tags = document.querySelector('.url-input-container[placeholder="Signals for your tribe."]').value.split(',').map(tag => tag.trim());
        const file = document.querySelector('#uploadArea input[type="file"]').files[0];
        
        // Get visibility setting
        const visibilityOption = document.querySelector('.radio-btn.active').closest('.option-item').querySelector('.option-title').textContent;
        let visibilityEnum;
        switch (visibilityOption.toLowerCase()) {
            case 'public':
                visibilityEnum = 0; // Public
                break;
            case 'private involvement':
                visibilityEnum = 1; // Private
                break;
            case 'token-gated':
                visibilityEnum = 2; // TokenGated
                break;
            default:
                visibilityEnum = 0;
        }

        if (!file) {
            alert('Please select a file to mint');
            return;
        }

        // Upload file to IPFS
        const formData = new FormData();
        formData.append('file', file);

        const ipfsResponse = await fetch('YOUR_IPFS_API_ENDPOINT', {
            method: 'POST',
            body: formData
        });
        const ipfsData = await ipfsResponse.json();
        const ipfsHash = ipfsData.Hash;

        // Call the smart contract
        const tx = await contract.uploadContent(
            title,
            description,
            tags,
            [], // topics array (empty for now)
            ipfsHash,
            file.type,
            file.size,
            visibilityEnum
        );

        // Wait for transaction to be mined
        await tx.wait();

        alert('Content successfully minted as NFT!');
        
        // Reset form
        document.querySelectorAll('.url-input-container').forEach(input => input.value = '');
        document.querySelector('#uploadArea input[type="file"]').value = '';
        
    } catch (error) {
        console.error('Error minting NFT:', error);
        alert('Error minting NFT: ' + error.message);
    }
};

// Add event listener to the "Stake Your Claim" button
document.addEventListener('DOMContentLoaded', () => {
    const stakeButton = document.querySelector('.action-button[aria-label="Stake Your Claim"]');
    if (stakeButton) {
        stakeButton.addEventListener('click', mintNFT);
    }
});

// File upload area interaction handlers
document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.querySelector('#uploadArea input[type="file"]');

    // Handle click on upload area
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Update upload area content
            const uploadContent = uploadArea.querySelector('.upload-content');
            uploadContent.innerHTML = `
                <h2>${file.name}</h2>
                <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>${file.type}</p>
            `;
        }
    });

    // Handle drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            fileInput.files = e.dataTransfer.files;
            // Update upload area content
            const uploadContent = uploadArea.querySelector('.upload-content');
            uploadContent.innerHTML = `
                <h2>${file.name}</h2>
                <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>${file.type}</p>
            `;
        }
    });
});

// Radio button functionality
document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('.radio-btn');
    radioButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            radioButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('inactive');
            });
            // Add active class to clicked button
            button.classList.remove('inactive');
            button.classList.add('active');
        });
    });
});

// Gallery item selection
document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all items
        document.querySelectorAll('.gallery-item-caroussel.active')
            .forEach(activeItem => activeItem.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
    });
});

// Form validation
const validateForm = () => {
    const title = document.querySelector('.url-input-container[placeholder="Say what it is, and let it speak for itself."]').value;
    const description = document.querySelector('.url-input-container[placeholder="Paste the URL that proves you were first here."]').value;
    const tags = document.querySelector('.url-input-container[placeholder="Signals for your tribe."]').value;
    const file = document.querySelector('#uploadArea input[type="file"]').files[0];
    const selectedType = document.querySelector('.gallery-item-caroussel.active');
    const selectedVisibility = document.querySelector('.radio-btn.active');

    if (!title) {
        alert('Please enter a title for your content');
        return false;
    }
    if (!description) {
        alert('Please enter a description for your content');
        return false;
    }
    if (!tags) {
        alert('Please add some tags for your content');
        return false;
    }
    if (!file) {
        alert('Please upload a file');
        return false;
    }
    if (!selectedType) {
        alert('Please select a content type');
        return false;
    }
    if (!selectedVisibility) {
        alert('Please select a visibility option');
        return false;
    }

    return true;
};

// Add event listener to the final mint button
document.addEventListener('DOMContentLoaded', () => {
    const finalMintButton = document.getElementById('finalMintButton');
    if (finalMintButton) {
        finalMintButton.addEventListener('click', () => {
            if (validateForm()) {
                mintNFT();
            }
        });
    }
}); 