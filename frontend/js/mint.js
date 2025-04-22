console.log("✅ mint.js wurde geladen!");


// Minting functionality for OcosoMintNFT
const mintNFT = async () => {
    try {
        if (!window.ethereum) {
            alert('Please install MetaMask to mint NFTs');
            return;
        }

        // 🧩 Formulardaten holen
        const title = document.getElementById('mint-title').value.trim();
        const description = document.getElementById('mint-description').value.trim();
        const tags = document.getElementById('mint-tags').value.split(',').map(tag => tag.trim());
        const file = selectedFile;

        const visibilityOption = document.querySelector('.radio-btn.active')
            .closest('.option-item').querySelector('.option-title').textContent;

        let visibilityEnum = 0;
        switch ((visibilityOption || '').toLowerCase()) {
            case 'public': visibilityEnum = 0; break;
            case 'private involvement': visibilityEnum = 1; break;
            case 'token-gated': visibilityEnum = 2; break;
        }

        if (!file) {
            alert('Please select a file to mint');
            return;
        }

        // 📦 Simulierter Upload
        const ipfsHash = `QmDummyHash_${Date.now()}`;
        console.log("🧬 Simulierter IPFS Hash:", ipfsHash);

        // 🤖 Simulierter Contract
        const contract = {
            uploadContent: async (...args) => {
                console.log("📡 Simulierter Smart Contract Call mit Parametern:", args);
                return {
                    wait: async () => {
                        console.log("⛏️ Simuliertes Mining abgeschlossen.");
                    }
                };
            }
        };

        const topicArray = selectedType ? [selectedType] : [];

        // 🚀 "Minten"
        const tx = await contract.uploadContent(
            title,
            description,
            tags,
            topicArray,
            ipfsHash,
            file.type,
            file.size,
            visibilityEnum
        );

        await tx.wait();

        alert('✅ Content successfully minted as NFT!');

        // 🧹 Reset
        // Nur Input-Felder in .url-input-container zurücksetzen
        document.querySelectorAll('.url-input-container input').forEach(input => input.value = '');

        // Datei-Input sicher zurücksetzen (falls vorhanden)
        const fileInput = document.querySelector('#uploadArea input[type="file"]');
        if (fileInput) fileInput.value = '';
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
    const title = document.getElementById('mint-title').value.trim();
    const description = document.getElementById('mint-description').value.trim();
    const tags = document.getElementById('mint-tags').value.trim();
    const file = selectedFile;
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
        console.log("✅ Mint-Button gefunden!");

        finalMintButton.addEventListener('click', () => {
            console.log("🟢 Mint-Button wurde geklickt!");
            if (validateForm()) {
                console.log("🧪 Formular valide – mintNFT() wird ausgeführt...");
                mintNFT();
            } else {
                console.warn("⚠️ Formular nicht valide – mintNFT() wird NICHT ausgeführt.");
            }
        });
    } else {
        console.error("❌ Mint-Button NICHT gefunden!");
    }
});