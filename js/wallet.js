// Check if MetaMask is installed
const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
};

// Connect to MetaMask wallet
const connectWallet = async () => {
    try {
        if (!isMetaMaskInstalled()) {
            alert('Please install MetaMask to connect your wallet!');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            const account = accounts[0];
            updateWalletButton(account);
            return account;
        }
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        alert('Failed to connect to MetaMask. Please try again.');
    }
};

// Update wallet button text and state
const updateWalletButton = (account) => {
    const button = document.querySelector('.wallet-button');
    const buttonText = document.querySelector('.wallet-button-text');
    
    if (account) {
        // Truncate the address for display
        const truncatedAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
        buttonText.textContent = truncatedAddress;
        button.classList.add('connected');
    } else {
        buttonText.textContent = 'CONNECT WALLET';
        button.classList.remove('connected');
    }
};

// Handle account changes
const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
        // User disconnected their wallet
        updateWalletButton(null);
    } else {
        // User switched accounts
        updateWalletButton(accounts[0]);
    }
};

// Initialize wallet connection
const initWallet = () => {
    const button = document.querySelector('.wallet-button');
    if (button) {
        button.addEventListener('click', connectWallet);
    }

    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initWallet); 