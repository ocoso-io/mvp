import {BrowserProvider, Signer} from 'ethers';

/**
 * Type representing a wallet provider event handler.
 *
 * @param {unknown[]} args - Event arguments.
 * @returns {void}
 */
export type WalletProviderEventHandler = (...args: unknown[]) => void;

/**
 * Interface representing a wallet provider for interacting with blockchain-based wallets.
 */
export interface WalletProvider {
    /**
     * Checks if the wallet provider is installed in the browser.
     * @returns {boolean} True if installed, false otherwise.
     */
    isInstalled(): boolean;

    /**
     * Connects to the wallet provider.
     * @returns {Promise<string | null>} The account address if connected, null otherwise.
     */
    connect(): Promise<string | null>;

    /**
     * Disconnects from the wallet provider.
     */
    disconnect(): Promise<void>;

    /**
     * Returns the list of accounts available in the wallet provider.
     *
     * @returns {Promise<string[]>} The list of accounts.
     */
    getAccounts(): Promise<string[]>;

    /**
     * Returns the provider instance.
     *
     * @returns {BrowserProvider | null} The provider instance, or null if not connected.
     */
    getProvider(): BrowserProvider | null;

    /**
     * Returns the signer instance.
     *
     * @returns {Signer | null} The signer instance, or null if not connected.
     */
    getSigner(): Promise<Signer | null>;

    /**
     * Returns the chain ID.
     *
     * @returns {Promise<number | null>} The chain ID, or null if not connected.
     */
    getChainId(): Promise<number | null>;

    /**
     * Adds an event listener.
     *
     * @param {string} event The event name.
     * @param {WalletProviderEventHandler} handler The event handler.
     */
    on(event: string, handler: WalletProviderEventHandler): void;

    /**
     * Removes an event listener.
     *
     * @param {string} event The event name.
     * @param {WalletProviderEventHandler} handler The event handler.
     */
    off(event: string, handler: WalletProviderEventHandler): void;
}
