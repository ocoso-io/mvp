import {type BrowserProvider, type Signer} from 'ethers';

import {type WalletProvider, type WalletProviderEventHandler} from './WalletProvider.interface';

/**
 * An empty wallet provider that implements the WalletProvider interface
 * but doesn't provide any actual wallet functionality.
 * Can be used as a fallback when no wallet is available.
 */
export class EmptyWalletProvider implements WalletProvider {
    /**
     * Always returns false since this provider doesn't represent an actual wallet.
     * @returns {boolean} Always false
     */
    public isInstalled(): boolean {
        return false;
    }

    /**
     * Simulates a failed connection attempt.
     * @returns {Promise<string | null>} Always null
     */
    public async connect(): Promise<string | null> {
        console.warn('EmptyWalletProvider: Connection attempt ignored.');
        return null;
    }

    /**
     * Simulates a disconnection (no actual action required).
     * @returns {Promise<void>}
     */
    public async disconnect(): Promise<void> {
        console.info('EmptyWalletProvider: Disconnection simulated.');
        return;
    }

    /**
     * Returns an empty list of accounts.
     * @returns {Promise<string[]>} An empty array
     */
    public async getAccounts(): Promise<string[]> {
        return [];
    }

    /**
     * Always returns null as no provider is available.
     * @returns {BrowserProvider | null} Always null
     */
    public getProvider(): BrowserProvider | null {
        return null;
    }

    /**
     * Always returns null as no signer is available.
     * @returns {Promise<Signer | null>} Always null
     */
    public async getSigner(): Promise<Signer | null> {
        return null;
    }

    /**
     * Always returns null as no chain ID is available.
     * @returns {Promise<number | null>} Always null
     */
    public async getChainId(): Promise<number | null> {
        return null;
    }

    /**
     * Registers an event handler that will never be called.
     * The handler is stored to maintain consistency with the interface.
     *
     * @param {string} _event The event name
     * @param {WalletProviderEventHandler} _handler The event handler
     */
    public on(_event: string, _handler: WalletProviderEventHandler): void {}

    /**
     * Removes an event handler from internal storage.
     *
     * @param {string} _event The event name
     * @param {WalletProviderEventHandler} _handler The handler to remove
     */
    public off(_event: string, _handler: WalletProviderEventHandler): void {}
}
