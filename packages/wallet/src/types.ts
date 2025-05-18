export interface EthereumProvider {
    isMetaMask: boolean;
    request: (request: {method: string; params?: unknown[]}) => Promise<unknown>;
    on: (eventName: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
    interface Window {
        ethereum: EthereumProvider;
    }
}

export interface WalletManagerConfig {
    buttonSelector: string;
    buttonWrapperSelector: string;
    buttonTextSelector: string;
    supportedChainIds: number[];
}

export enum WalletEvent {
    CONNECTED = 'wallet-connected',
    DISCONNECTED = 'wallet-disconnected',
    CHAIN_CHANGED = 'wallet-chain-changed',
    ACCOUNTS_CHANGED = 'wallet-accounts-changed',
}

export enum WalletState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
    NETWORK_MISMATCH = 'network_mismatch',
}
