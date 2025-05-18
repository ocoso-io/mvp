export interface NetworkInfo {
    name: string;
    chainId: number;
    blockExplorer?: string;
    currencySymbol: string;
}

export const NETWORK_INFO: Record<number, NetworkInfo> = {
    1: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        blockExplorer: 'https://etherscan.io',
        currencySymbol: 'ETH',
    },
    5: {
        name: 'Goerli Testnet',
        chainId: 5,
        blockExplorer: 'https://goerli.etherscan.io',
        currencySymbol: 'GoerliETH',
    },
    11_155_111: {
        name: 'Sepolia Testnet',
        chainId: 11_155_111,
        blockExplorer: 'https://sepolia.etherscan.io',
        currencySymbol: 'SepoliaETH',
    },
};
