import {BrowserProvider, Signer} from 'ethers';

import {WalletConnectionError} from '../errors';

import {WalletProvider, WalletProviderEventHandler} from './WalletProvider.interface';

export class MetaMaskProvider implements WalletProvider {
    private provider: BrowserProvider | null = null;
    private signer: Signer | null = null;

    public isInstalled(): boolean {
        return globalThis.ethereum !== undefined && (globalThis.ethereum.isMetaMask as boolean);
    }

    public async connect(): Promise<string | null> {
        if (!this.isInstalled()) {
            throw new WalletConnectionError('MetaMask ist nicht installiert');
        }

        try {
            const accounts = await globalThis.ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!Array.isArray(accounts) || accounts.length === 0) {
                throw new WalletConnectionError('Keine Konten verfügbar');
            }

            this.provider = new BrowserProvider(globalThis.ethereum);
            this.signer = await this.provider.getSigner();

            return accounts[0] as string;
        } catch (error) {
            throw new WalletConnectionError('Fehler bei der Verbindung zu MetaMask', error);
        }
    }

    public async disconnect(): Promise<void> {
        this.provider = null;
        this.signer = null;
    }

    public async getAccounts(): Promise<string[]> {
        if (!this.isInstalled()) {
            return [];
        }

        try {
            return (await globalThis.ethereum.request({method: 'eth_accounts'})) as string[];
        } catch (error) {
            console.error('Fehler beim Abrufen der Konten:', error);
            return [];
        }
    }

    public getProvider(): BrowserProvider | null {
        return this.provider;
    }

    public async getSigner(): Promise<Signer | null> {
        if (!this.signer && this.provider) {
            try {
                this.signer = await this.provider.getSigner();
            } catch (error) {
                console.error('Fehler beim Abrufen des Signers:', error);
            }
        }
        return this.signer;
    }

    public async getChainId(): Promise<number | null> {
        if (!this.provider) return null;

        try {
            const network = await this.provider.getNetwork();
            return Number(network.chainId);
        } catch (error) {
            console.error('Fehler beim Abrufen der Chain-ID:', error);
            return null;
        }
    }

    public on(event: string, handler: WalletProviderEventHandler): void {
        if (this.isInstalled()) {
            globalThis.ethereum.on(event, handler);
        }
    }

    public off(event: string, handler: WalletProviderEventHandler): void {
        if (this.isInstalled()) {
            globalThis.ethereum.removeListener(event, handler);
        }
    }
}
