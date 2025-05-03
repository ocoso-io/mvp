// src/wallet-manager.ts
import { BrowserProvider, Signer } from 'ethers';
import { WalletManagerConfig, WalletEvent, WalletState } from './types';
import { NetworkValidationError } from './errors';
import { StorageService } from './service/storage-service';
import { UIService } from './service/ui-service';
import { EventService } from './service/event-service';
import { WalletProvider } from './provider/wallet-provider.interface';
import { MetaMaskProvider } from './provider/metamask-provider';
import { NetworkValidator } from './service/network-validator';

export class WalletManager {
    private readonly provider: WalletProvider;
    private networkValidator: NetworkValidator;
    private storageService: StorageService;
    private uiService: UIService;
    private eventService: EventService;

    private currentAccount: string | null = null;
    private state: WalletState = WalletState.DISCONNECTED;
    private config: WalletManagerConfig;

    constructor(config?: Partial<WalletManagerConfig>) {
        this.config = {
            buttonSelector: '.wallet-button',
            buttonWrapperSelector: '.wallet-button-wrapper',
            buttonTextSelector: '.wallet-button-text',
            supportedChainIds: [1, 5, 11155111], // Mainnet, Goerli, Sepolia
            ...config
        };

        // Initialisiere die Dienste
        this.provider = new MetaMaskProvider();
        this.networkValidator = new NetworkValidator(this.config.supportedChainIds);
        this.storageService = new StorageService();
        this.uiService = new UIService(
            this.config.buttonWrapperSelector,
            this.config.buttonTextSelector
        );
        this.eventService = new EventService();

        this.initEventListeners();
    }

    // Verbindung zu MetaMask herstellen
    public async connectWallet(): Promise<string | null> {
        try {
            this.setState(WalletState.CONNECTING);

            if (!this.provider.isInstalled()) {
                await this.checkAndInstallMetaMask();
                return null;
            }

            // Verbinde mit dem Provider
            this.currentAccount = await this.provider.connect();

            if (!this.currentAccount) {
                this.setState(WalletState.DISCONNECTED);
                return null;
            }

            // Netzwerk validieren
            await this.validateCurrentNetwork();

            // UI aktualisieren
            this.uiService.updateWalletButton(this.currentAccount);

            // Status speichern
            this.storageService.saveItem('connected', true);
            this.setState(WalletState.CONNECTED);

            // Event auslösen
            this.eventService.dispatchEvent(WalletEvent.CONNECTED, { account: this.currentAccount });

            return this.currentAccount;
        } catch (error) {
            this.handleConnectionError(error);
            return null;
        }
    }

    // Wallet trennen
    public async disconnectWallet(): Promise<void> {
        await this.provider.disconnect();

        this.currentAccount = null;
        this.setState(WalletState.DISCONNECTED);

        this.uiService.updateWalletButton(null);
        this.storageService.saveItem('connected', false);

        this.eventService.dispatchEvent(WalletEvent.DISCONNECTED);
        this.uiService.showNotification('Wallet wurde getrennt.', 'info');
    }

    // MetaMask installieren
    private async checkAndInstallMetaMask(): Promise<boolean> {
        if (this.provider.isInstalled()) {
            return true;
        }

        // Auf mobilen Geräten zum MetaMask-Browser wechseln
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            const dappUrl = window.location.href;
            window.open(`https://metamask.app.link/dapp/${dappUrl}`, '_blank');
            return false;
        }

        // Desktop-Benutzer zur Download-Seite leiten
        const shouldInstall = confirm('MetaMask ist nicht installiert. Möchtest du es jetzt installieren?');
        if (shouldInstall) {
            window.open('https://metamask.io/download/', '_blank');
        }

        return false;
    }

    // Netzwerk validieren
    private async validateCurrentNetwork(): Promise<void> {
        const chainId = await this.provider.getChainId();

        if (chainId === null) {
            throw new NetworkValidationError('Konnte Netzwerk-ID nicht abrufen', 0);
        }

        try {
            this.networkValidator.validateChainId(chainId);
        } catch (error) {
            if (error instanceof NetworkValidationError) {
                this.uiService.showNotification(error.message, 'error');
                this.setState(WalletState.NETWORK_MISMATCH);
            }
            throw error;
        }
    }

    // Fehlerbehandlung für Verbindungsfehler
    private handleConnectionError(error: unknown): void {
        if (error instanceof Error) {
            // Benutzerabbruch nicht als Fehler behandeln
            if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
                console.warn('Benutzer hat die Verbindung abgelehnt');
                this.setState(WalletState.DISCONNECTED);
                return;
            }

            // Netzwerkfehler wurden bereits behandelt
            if (error instanceof NetworkValidationError) {
                return;
            }
        }

        console.error('Fehler bei der Verbindung zur Wallet:', error);
        this.uiService.showNotification('Verbindung zur Wallet fehlgeschlagen. Bitte versuche es erneut.', 'error');
        this.setState(WalletState.ERROR);
    }

    // Status ändern
    private setState(newState: WalletState): void {
        const oldState = this.state;
        this.state = newState;

        // Event auslösen bei Statusänderung, wenn sich der Status tatsächlich geändert hat
        if (oldState !== newState) {
            this.eventService.dispatchEvent(WalletEvent.CHAIN_CHANGED, { oldState, newState });
        }
    }

    // Kontoänderungen verarbeiten
    private handleAccountsChanged = async (accounts: string[]): Promise<void> => {
        if (accounts.length === 0) {
            // Benutzer hat seine Wallet getrennt
            await this.disconnectWallet();
        } else if (this.currentAccount !== accounts[0]) {
            // Benutzer hat das Konto gewechselt
            this.currentAccount = accounts[0];
            this.uiService.updateWalletButton(accounts[0]);

            // Event auslösen
            this.eventService.dispatchEvent(WalletEvent.ACCOUNTS_CHANGED, { account: accounts[0] });
        }
    };

    // Netzwerkwechsel verarbeiten
    private handleChainChanged = async (): Promise<void> => {
        // Bei Netzwerkwechsel die Seite neu laden
        window.location.reload();
    };

    // Event-Listener initialisieren
    private initEventListeners(): void {
        if (this.provider.isInstalled()) {
            this.provider.on('accountsChanged', this.handleAccountsChanged);
            this.provider.on('chainChanged', this.handleChainChanged);
        }
    }

    // Event-Listener entfernen
    public cleanup(): void {
        if (this.provider.isInstalled()) {
            this.provider.off('accountsChanged', this.handleAccountsChanged);
            this.provider.off('chainChanged', this.handleChainChanged);
        }
    }

    // Wallet-Verbindung initialisieren
    public initWalletConnection(): void {
        const button = document.querySelector(this.config.buttonSelector) as HTMLElement | null;
        if (button) {
            button.addEventListener('click', () => this.connectWallet());
        }

        // Nach bestehender Verbindung prüfen
        this.checkExistingConnection();
    }

    // Prüfen, ob bereits eine Verbindung besteht
    private async checkExistingConnection(): Promise<void> {
        if (!this.provider.isInstalled() || !this.storageService.getItem('connected', false)) {
            return;
        }

        try {
            const accounts = await this.provider.getAccounts();
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];

                // Netzwerk validieren
                try {
                    await this.validateCurrentNetwork();
                    this.uiService.updateWalletButton(this.currentAccount);
                    this.setState(WalletState.CONNECTED);
                    this.eventService.dispatchEvent(WalletEvent.CONNECTED, { account: this.currentAccount });
                } catch (error) {
                    this.storageService.saveItem('connected', false);
                }
            } else {
                this.storageService.saveItem('connected', false);
            }
        } catch (error) {
            console.error('Fehler beim Prüfen der bestehenden Verbindung:', error);
            this.storageService.saveItem('connected', false);
        }
    }

    // Öffentliche Hilfsmethoden

    public isConnected(): boolean {
        return this.state === WalletState.CONNECTED && this.currentAccount !== null;
    }

    public getState(): WalletState {
        return this.state;
    }

    public getCurrentAccount(): string | null {
        return this.currentAccount;
    }

    public async getChainId(): Promise<number | null> {
        return this.provider.getChainId();
    }

    public getProvider(): BrowserProvider | null {
        if (this.provider instanceof MetaMaskProvider) {
            return this.provider.getProvider();
        }
        return null;
    }

    public async getSigner(): Promise<Signer | null> {
        return this.provider.getSigner();
    }
}
