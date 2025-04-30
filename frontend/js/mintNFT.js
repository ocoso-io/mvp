Okay, hier ist die aktuelle Version des JavaScript-Codes, nachdem die Redundanz beseitigt und die erste `mintNFT(nftData)`-Funktion in den Workflow integriert wurde.

**Wichtiger Hinweis:** Denken Sie daran, dass die Pinata API-Schlüssel aus Sicherheitsgründen **nicht** im Frontend-Code verbleiben sollten, wenn Sie dies über einen Test hinaus verwenden möchten.

```javascript
// Import ethers (assuming this is at the top level or handled by a build tool)
import { ethers } from 'ethers';

/**
 * Represents the structure of NFT data.
 * @typedef {Object} NFTData
 * @property {string} title - The title of the NFT. (Mapped to 'name' in contract)
 * @property {string} description - A description of the NFT. (Used in metadata)
 * @property {string[]} tags - Array of tags associated with the NFT.
 * @property {string} category - The category of the NFT.
 * @property {string} visibility - The visibility status of the NFT (Application-level).
 * @property {string} onchainText - On-chain metadata or text associated with the NFT.
 * @property {string} tokenURI - The token URI linking to the NFT metadata location.
 * @property {string} contentLink - Link to the actual content of the NFT.
 */

// Main application logic wrapped in an IIFE
(() => {
    console.log("✅ mintNFT.js wurde geladen!");

    // Kapselung: keine globalen Variablen
    let selectedFile = null;
    let selectedType = null; // Wird zur 'category' im nftData

    // --- Blockchain and Pinata Configuration ---
    const CONTRACT_ADDRESS = "0xc205237602bB7ed983a65a5c87F765Ff02837066";
    const CONTRACT_ABI = [
        "function mintNFT(string category,string name,string[] tags,string contentLink,string onchainText,string tokenURI) external payable",
        "function withdraw() external"
    ];
    const MINT_FEE_ETH = "0.01"; // Mint fee constant

    // !! WICHTIG: API Keys niemals direkt im Frontend-Code lassen für Produktion !!
    // !! Dies ist ein Sicherheitsrisiko. Verwenden Sie stattdessen einen Backend-Proxy. !!
    const apiKey = "7168ddc744fbfb8a91d0"; // Pinata API Key
    const secret = "bf60b5f0116df980222e610585d90a9d0ad86987c755b3f07691fd74834499fe"; // Pinata Secret Key

    // Initialize contract instance (if MetaMask is present)
    let contract;
    let provider;
    let signer;
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            console.log("Ethers Contract initialisiert.");
        } catch (error) {
             console.error("Fehler bei der Initialisierung von Ethers:", error);
             alert("Fehler bei der Verbindung mit MetaMask. Bitte Seite neu laden oder Erweiterung prüfen.");
        }
    } else {
        console.warn("MetaMask nicht gefunden. Blockchain-Interaktionen sind nicht möglich.");
        // Optional: Disable mint button or show message to user
        // document.getElementById('finalMintButton').disabled = true;
        // alert("Bitte installieren Sie MetaMask, um diese Funktion nutzen zu können.");
    }

    // --- Helper Functions ---

    /**
     * Uploads file and metadata to Pinata (IPFS).
     * @param {File} file - The file to upload.
     * @param {string} title - NFT Title for metadata.
     * @param {string} description - NFT Description for metadata.
     * @returns {Promise<{contentLink: string, tokenURI: string}>} - IPFS links.
     * @throws {Error} If upload fails.
     */
    async function uploadDataToIpfs(file, title, description) {
        if (!file || !title || !description) {
            throw new Error("Fehlende Daten für IPFS-Upload (Datei, Titel oder Beschreibung).");
        }
        if (!apiKey || !secret) {
            // This check is mainly for development; keys should ideally not be handled client-side.
            throw new Error("Pinata API Keys nicht konfiguriert (im Code).");
        }

        console.log("Starte IPFS Upload für Datei:", file.name);
        // 1. Upload File (Content)
        const fileFormData = new FormData();
        fileFormData.append("file", file);

        let fileData;
        try {
            const fileRes = await fetch(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                {
                    method: "POST",
                    headers: {
                        pinata_api_key: apiKey,
                        pinata_secret_api_key: secret
                    },
                    body: fileFormData
                }
            );

            if (!fileRes.ok) {
                let errorBody = "Unbekannter Fehler";
                try {
                     errorBody = await fileRes.text();
                } catch(_) {}
                throw new Error(`Fehler beim Hochladen der Datei zu Pinata (${fileRes.status}): ${errorBody}`);
            }
            fileData = await fileRes.json();
            if (!fileData.IpfsHash) {
                 throw new Error("Pinata-Antwort für Datei-Upload enthält keinen IpfsHash.");
            }
        } catch (error) {
             console.error("Fehler beim Pinata Datei-Upload Fetch:", error);
             throw new Error(`Netzwerk- oder API-Fehler beim Datei-Upload: ${error.message}`);
        }

        const contentLink = `ipfs://${fileData.IpfsHash}`;
        console.log("Datei erfolgreich hochgeladen:", contentLink);

        // 2. Upload Metadata JSON
        console.log("Erstelle und lade Metadaten hoch...");
        const metadata = {
            name: title,
            description: description,
            image: contentLink // Standard metadata field for the content URI
            // Hier könnten weitere Attribute hinzugefügt werden:
            // attributes: [ { "trait_type": "Category", "value": categoryFromUI }, ... ]
        };

        let metaData;
        try {
            const metaRes = await fetch(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        pinata_api_key: apiKey,
                        pinata_secret_api_key: secret
                    },
                    body: JSON.stringify(metadata)
                }
            );

            if (!metaRes.ok) {
                let errorBody = "Unbekannter Fehler";
                try {
                     errorBody = await metaRes.text();
                } catch(_) {}
                throw new Error(`Fehler beim Hochladen der Metadaten zu Pinata (${metaRes.status}): ${errorBody}`);
            }
             metaData = await metaRes.json();
              if (!metaData.IpfsHash) {
                 throw new Error("Pinata-Antwort für Metadaten-Upload enthält keinen IpfsHash.");
            }
        } catch (error) {
             console.error("Fehler beim Pinata Metadaten-Upload Fetch:", error);
             throw new Error(`Netzwerk- oder API-Fehler beim Metadaten-Upload: ${error.message}`);
        }


        const tokenURI = `ipfs://${metaData.IpfsHash}`;
        console.log("Metadaten erfolgreich hochgeladen:", tokenURI);

        return { contentLink, tokenURI };
    }

    /**
     * Mints an NFT on the blockchain using the provided data object.
     * This function interacts with MetaMask and the smart contract.
     *
     * @param {NFTData} nftData - The NFT data object containing all necessary info.
     * @returns {Promise<ethers.providers.TransactionReceipt>} - The transaction receipt.
     * @throws {Error} If minting fails for any reason.
     */
    async function mintNFT(nftData) {
        console.log("Starte Minting-Prozess mit NFTData:", nftData);

        // Ensure contract is initialized (MetaMask check included)
        if (!contract || !signer || !provider) {
             // Try to re-initialize if signer was lost (e.g., user changed account)
             if (window.ethereum) {
                 console.log("Versuche Ethers neu zu initialisieren...");
                 provider = new ethers.providers.Web3Provider(window.ethereum);
                 signer = provider.getSigner();
                 contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                 if (!signer || !contract) {
                      throw new Error('MetaMask nicht verbunden oder Vertrag nicht initialisiert.');
                 }
             } else {
                throw new Error('MetaMask nicht gefunden.');
             }
        }

        // Request account access every time to ensure connection and correct account
        try {
             await window.ethereum.request({ method: 'eth_requestAccounts' });
             // Update signer just in case the user changed accounts in MetaMask
             signer = provider.getSigner();
             contract = contract.connect(signer); // Reconnect contract instance with potentially new signer
        } catch (error) {
             console.error("Fehler bei eth_requestAccounts:", error);
             throw new Error("Kontozugriff über MetaMask verweigert oder fehlgeschlagen.");
        }


        try {
            // Get user address and check balance
            const userAddress = await signer.getAddress();
             console.log(`Minting für Adresse: ${userAddress}`);
            const userBalance = await provider.getBalance(userAddress);
            const mintFee = ethers.utils.parseEther(MINT_FEE_ETH);

            if (userBalance.lt(mintFee)) {
                const required = ethers.utils.formatEther(mintFee);
                const balance = ethers.utils.formatEther(userBalance);
                throw new Error(`Nicht genügend Guthaben zum Minten. Benötigt: ${required} ETH, Verfügbar: ${balance} ETH.`);
            }
            console.log(`Guthaben ausreichend. Mint-Gebühr: ${MINT_FEE_ETH} ETH.`);

            // Prepare arguments from nftData object
            const category = nftData.category;
            const name = nftData.title; // Map title to name for contract
            const tags = nftData.tags;
            const contentLink = nftData.contentLink;
            const onchainText = nftData.onchainText;
            const tokenURI = nftData.tokenURI;

            // Basic validation of data needed for contract
             if (!category || !name || !Array.isArray(tags) || !contentLink || !tokenURI) {
                 console.error("Validierungsfehler im NFTData-Objekt:", {category, name, tags, contentLink, tokenURI});
                 throw new Error("Unvollständige oder ungültige Daten im NFTData-Objekt für den Vertrag.");
             }

            console.log("Rufe Smart Contract 'mintNFT' Funktion auf...");
            console.log("Parameter:", { category, name, tags, contentLink, onchainText, tokenURI });

            // Call the smart contract function
            const tx = await contract.mintNFT(
                category,
                name,
                tags,
                contentLink,
                onchainText,
                tokenURI,
                { value: mintFee } // Sending the required fee along with the transaction
            );

            console.log(`Transaktion gesendet: ${tx.hash}. Warte auf Bestätigung...`);
            const receipt = await tx.wait(); // Wait for transaction confirmation
            console.log(`✅ NFT erfolgreich gemintet! Transaktion bestätigt in Block: ${receipt.blockNumber}`);

            return receipt; // Return the receipt

        } catch (error) {
            console.error('Fehler während des Minting-Prozesses:', error);
            // Improve error message extraction if possible (some errors have nested details)
            let readableError = error.message;
            if (error.data?.message) { // Check for nested error message (common in RPC errors)
                 readableError = error.data.message;
            } else if (error.reason) { // Ethers-specific revert reason
                 readableError = error.reason;
            }

            if (error.code === 4001) { // EIP-1193 user rejected request error
                throw new Error('Minting-Transaktion vom Benutzer abgelehnt.');
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                 throw new Error(`Fehler: Nicht genügend Guthaben für Transaktionsgebühren + Mint-Gebühr (${MINT_FEE_ETH} ETH).`);
            }
            // Rethrow cleaned-up error
            throw new Error(`Minting fehlgeschlagen: ${readableError}`);
        }
    }


    /**
     * Validates the minting form inputs.
     * @returns {boolean} - True if form is valid, false otherwise.
     */
    const validateForm = () => {
        // Using basic alert for simplicity, could be improved with inline validation messages
        const title = document.getElementById('mint-title')?.value.trim();
        const description = document.getElementById('mint-description')?.value.trim();
        const tags = document.getElementById('mint-tags')?.value.trim(); // Tags are optional for validation maybe?

        if (!title) {
            alert('Bitte Titel eingeben.'); return false;
        }
        if (!description) {
            alert('Bitte Beschreibung eingeben.'); return false;
        }
        // Tags might be optional, adjust validation if needed
        // if (!tags) {
        //     alert('Bitte Tags eingeben (Komma-getrennt).'); return false;
        // }
        if (!selectedFile) {
            alert('Bitte Datei hochladen.'); return false;
        }
        if (!selectedType) { // This is the category
            alert('Bitte Inhaltstyp (Kategorie) wählen.'); return false;
        }
        if (!document.querySelector('.radio-btn.active')) {
            alert('Bitte Sichtbarkeit wählen.'); return false;
        }
        // Check for MetaMask connection (optional here, handled more robustly in mintNFT)
        if (!window.ethereum || !signer) {
             alert('MetaMask ist nicht verbunden oder nicht initialisiert. Bitte verbinden Sie MetaMask.');
             return false;
        }
        return true;
    };

     /**
     * Resets the minting form to its initial state.
     */
     const resetForm = () => {
         console.log("Setze Formular zurück...");
         document.getElementById('mint-title').value = "";
         document.getElementById('mint-description').value = "";
         document.getElementById('mint-tags').value = "";
         document.getElementById('onchainText').value = ""; // Assuming an ID 'onchainText' exists

         const fileInput = document.querySelector('#uploadArea input[type="file"]');
         if (fileInput) fileInput.value = ""; // Clear file input selection

         selectedFile = null;
         selectedType = null;

         // Reset upload area display
         const uploadArea = document.getElementById('uploadArea');
         const uploadContent = uploadArea?.querySelector('.upload-content');
         if (uploadContent) {
              // Restore original HTML or a simple placeholder
              uploadContent.innerHTML = '<div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><p>Drag and drop files here, or click to browse</p>';
         }

         // Reset gallery selection display
         document.querySelectorAll('.gallery-item-caroussel.active').forEach(ai => ai.classList.remove('active'));

         // Reset radio button display (select default if needed, e.g., public)
         document.querySelectorAll('.radio-btn').forEach(b => b.classList.replace('active', 'inactive'));
         // Optional: Set a default visibility active again, e.g., 'public'
         // document.querySelector('#visibility-public-btn')?.classList.replace('inactive', 'active'); // Assuming an ID for the public button

        console.log("Formular zurückgesetzt.");
     };


    // --- UI Event Listeners ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM geladen. Initialisiere UI-Handler.");

        // File Upload Area Logic
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) {
             console.error("Upload-Bereich (uploadArea) nicht im DOM gefunden!");
             return; // Stop initialization if critical elements are missing
        }
        const fileInput = uploadArea.querySelector('input[type="file"]');
         if (!fileInput) {
             console.error("Datei-Input im Upload-Bereich nicht gefunden!");
             return;
        }
        const uploadContent = uploadArea.querySelector('.upload-content');
         if (!uploadContent) {
              console.error("Upload-Content-Bereich nicht gefunden!");
              return;
         }


        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                selectedFile = e.target.files[0];
                uploadContent.innerHTML = `<h2>${selectedFile.name}</h2>
                                <p>${(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p>${selectedFile.type}</p>`;
            }
        });
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                selectedFile = e.dataTransfer.files[0];
                fileInput.files = e.dataTransfer.files; // Sync file input
                uploadContent.innerHTML = `<h2>${selectedFile.name}</h2>
                                <p>${(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p>${selectedFile.type}</p>`;
            }
        });

        // Gallery (Category) Selection Logic
        document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.gallery-item-caroussel.active').forEach(ai => ai.classList.remove('active'));
                item.classList.add('active');
                selectedType = item.querySelector('h4')?.textContent.trim(); // This becomes nftData.category
                 if(selectedType) {
                    console.log("Kategorie gewählt:", selectedType);
                 } else {
                     console.warn("Kategorie-Titel (h4) im Gallery Item nicht gefunden.");
                 }
            });
        });

        // Visibility Radio Button Logic
        document.querySelectorAll('.radio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.radio-btn').forEach(b => b.classList.replace('active', 'inactive'));
                btn.classList.replace('inactive', 'active');
                console.log("Sichtbarkeit gewählt.");
            });
        });

        // Final Mint Button Logic
        const finalBtn = document.getElementById('finalMintButton');
        if (finalBtn) {
             // Initial check if MetaMask is detected on load
             if (!window.ethereum) {
                  finalBtn.textContent = "MetaMask fehlt!";
                  finalBtn.disabled = true;
                  alert("Bitte installieren Sie MetaMask, um NFTs minten zu können.");
             }

            finalBtn.addEventListener('click', async () => { // Make handler async
                if (!validateForm()) {
                    return; // Stop if validation fails
                }

                // Disable button to prevent multiple clicks
                finalBtn.disabled = true;
                finalBtn.textContent = "Prüfe & Lade hoch..."; // Provide feedback

                try {
                     // 1. Collect data from form
                    const title = document.getElementById('mint-title').value.trim();
                    const description = document.getElementById('mint-description').value.trim();
                    // Ensure tags are always an array, even if input is empty
                    const tags = document.getElementById('mint-tags').value.split(',')
                                        .map(t => t.trim())
                                        .filter(t => t); // Filter empty strings resulting from split
                    const category = selectedType;
                    const onchainText = document.getElementById('onchainText')?.value.trim() || "";
                    const visibilityOption = document.querySelector('.radio-btn.active')
                                                ?.closest('.option-item')
                                                ?.querySelector('.option-title')
                                                ?.textContent.trim().toLowerCase() || 'public'; // Default visibility


                    // 2. Upload file and metadata to IPFS
                    console.log("Starte IPFS Upload Prozess...");
                     finalBtn.textContent = "Lade Daten hoch...";
                    const { contentLink, tokenURI } = await uploadDataToIpfs(selectedFile, title, description);

                    // 3. Construct NFTData object
                    const nftData = {
                        title: title,
                        description: description, // Included for completeness, used in metadata
                        tags: tags,
                        category: category,
                        visibility: visibilityOption, // Store application-level visibility
                        onchainText: onchainText,
                        tokenURI: tokenURI,       // Result from IPFS metadata upload
                        contentLink: contentLink    // Result from IPFS file upload
                    };

                    // 4. Call the mintNFT function with the prepared data object
                     finalBtn.textContent = "Bestätige in MetaMask...";
                    const receipt = await mintNFT(nftData); // Call the refactored mint function

                    // 5. Success Handling
                    finalBtn.textContent = "Mint erfolgreich!";
                    alert(`✅ NFT erfolgreich gemintet! Transaktions-Hash: ${receipt.transactionHash}`);
                    resetForm(); // Reset form on success


                } catch (error) {
                    // 6. Error Handling
                    console.error("Fehler im Minting-Workflow:", error);
                     finalBtn.textContent = "Fehler!"; // Indicate error state on button
                    // Display error message more prominently if possible
                    alert(`Fehler beim Minten: ${error.message}`);
                    // Keep form data in case user wants to retry after fixing the issue (e.g., insufficient funds)
                } finally {
                     // Re-enable button after a short delay, unless it was successful
                     if (finalBtn.textContent.includes("erfolgreich")) {
                          setTimeout(() => {
                               finalBtn.disabled = false;
                               finalBtn.textContent = "Mint your NFT";
                          }, 3000); // Keep success message for a bit
                     } else {
                          finalBtn.disabled = false;
                           finalBtn.textContent = "Mint your NFT";
                     }
                }
            });
        } else {
            console.error("Mint-Button (finalMintButton) nicht im DOM gefunden!");
        }
    }); // End DOMContentLoaded

})(); // End IIFE
```