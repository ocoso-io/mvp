import { BrowserProvider, Signer } from 'ethers';

export interface WalletProvider {
    isInstalled(): boolean;
    connect(): Promise<string | null>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    getProvider(): BrowserProvider | null;
    getSigner(): Promise<Signer | null>;
    getChainId(): Promise<number | null>;
    on(event: string, handler: any): void;
    off(event: string, handler: any): void;
}
