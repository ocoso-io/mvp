console.log("✅ mintNFT.js wurde geladen!");

const CONTRACT_ADDRESS = "0xc205237602bB7ed983a65a5c87F765Ff02837066";
const CONTRACT_ABI = [
  "function mintNFT(string category,string name,string[] tags,string contentLink,string onchainText,string tokenURI) external payable",
  "function withdraw() external"
];

const apiKey = "7168ddc744fbfb8a91d0";
const secret = "bf60b5f0116df980222e610585d90a9d0ad86987c755b3f07691fd74834499fe";

const validateForm = () => {
  const title       = document.getElementById('mint-title').value.trim();
  const description = document.getElementById('mint-description').value.trim();
  const tags        = document.getElementById('mint-tags').value.trim();
  if (!title)       { alert('Bitte Titel eingeben.'); return false; }
  if (!description) { alert('Bitte Beschreibung eingeben.'); return false; }
  if (!tags)        { alert('Bitte Tags eingeben.'); return false; }
  if (!selectedFile){ alert('Bitte Datei hochladen.'); return false; }
  if (!document.querySelector('.gallery-item-caroussel.active')){
    alert('Bitte Inhaltstyp wählen.'); return false;
  }
  if (!document.querySelector('.radio-btn.active')){
    alert('Bitte Sichtbarkeit wählen.'); return false;
  }
  return true;
};

async function mintNFT() {
  try {
    if (!window.ethereum) {
      alert('MetaMask nicht gefunden');
      return;
    }

    // Formulardaten holen
    const title       = document.getElementById('mint-title').value.trim();
    const description = document.getElementById('mint-description').value.trim();
    const tags        = document.getElementById('mint-tags').value
                         .split(',').map(t=>t.trim());
    const file        = selectedFile;
    const onchainText = document.getElementById('onchainText')?.value || "";

    // Kategorie
    const category = document.querySelector('.gallery-item-caroussel.active h4')
                      .textContent.trim();

    // Sichtbarkeit
    const visibilityOption = document.querySelector('.radio-btn.active')
                          .closest('.option-item')
                          .querySelector('.option-title')
                          .textContent.trim().toLowerCase();
    const visibilityEnum = { public:0, 'private involvement':1, 'token-gated':2 }[visibilityOption] || 0;

    if (!title || !description || !file) {
      alert('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    // IPFS Upload
    const formData = new FormData();
    formData.append("file", file);
    const fileRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      { headers:{
          'Content-Type':'multipart/form-data',
          pinata_api_key:apiKey,
          pinata_secret_api_key:secret
        }}
    );
    const imageCid = fileRes.data.IpfsHash;
    const contentLink = `ipfs://${imageCid}`;

    // Metadaten uploaden
    const metadata = { name:title, description, image:contentLink };
    const metaRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      { headers:{
          pinata_api_key:apiKey,
          pinata_secret_api_key:secret
        }}
    );
    const metadataCid = metaRes.data.IpfsHash;
    const tokenURI = `ipfs://${metadataCid}`;

    // MetaMask verbinden
    await window.ethereum.request({ method:'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer   = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // mintNFT aufrufen
    const tx = await contract.mintNFT(
      category,
      title,
      tags,
      contentLink,
      onchainText,
      tokenURI,
      { value: ethers.utils.parseEther("0.01") }
    );
    await tx.wait();

    alert('✅ Content erfolgreich gemintet!');

    // Reset
    document.querySelectorAll('.url-input-container textarea,input')
      .forEach(el=>el.value="");
    document.querySelector('#uploadArea input[type="file"]').value = "";

  } catch (error) {
    console.error('Fehler beim Minten:', error);
    alert('Fehler: '+error.message);
  }
}

// Event‑Listener und UI‑Logik
document.addEventListener('DOMContentLoaded', () => {
  // Upload‑Area
  const uploadArea = document.getElementById('uploadArea');
  const fileInput  = uploadArea.querySelector('input[type="file"]');
  fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    const c = uploadArea.querySelector('.upload-content');
    c.innerHTML = `<h2>${selectedFile.name}</h2>
                   <p>${(selectedFile.size/1024/1024).toFixed(2)} MB</p>
                   <p>${selectedFile.type}</p>`;
  });
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault(); uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    selectedFile = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
    const c = uploadArea.querySelector('.upload-content');
    c.innerHTML = `<h2>${selectedFile.name}</h2>
                   <p>${(selectedFile.size/1024/1024).toFixed(2)} MB</p>
                   <p>${selectedFile.type}</p>`;
  });

  // Radio‑Buttons
  document.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.radio-btn').forEach(b=>b.classList.replace('active','inactive'));
      btn.classList.replace('inactive','active');
    });
  });

  // Galerie‑Selektion
  document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.gallery-item-caroussel.active')
        .forEach(ai=>ai.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Final‑Button
  const finalBtn = document.getElementById('finalMintButton');
  if (finalBtn) {
    finalBtn.addEventListener('click', () => {
      console.log("🟢 Mint gestartet");
      if (validateForm()) mintNFT();
    });
  }
});