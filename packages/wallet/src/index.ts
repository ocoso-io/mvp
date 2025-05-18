// Export der Singleton-Instanz
import {WalletManager} from './WalletManager';

export const walletManager = new WalletManager();

// Initialisierung automatisch starten
document.addEventListener('DOMContentLoaded', () => {
    walletManager.initWalletConnection();
});

// Aufräumen vor dem Schließen der Seite
window.addEventListener('beforeunload', () => {
    walletManager.cleanup();
});
