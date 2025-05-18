export class UiService {
    private readonly buttonWrapperSelector: string;
    private readonly buttonTextSelector: string;

    constructor(buttonWrapperSelector: string, buttonTextSelector: string) {
        this.buttonWrapperSelector = buttonWrapperSelector;
        this.buttonTextSelector = buttonTextSelector;
    }

    public updateWalletButton(account: string | null): void {
        const button = document.querySelector(this.buttonWrapperSelector);
        const buttonText = document.querySelector(this.buttonTextSelector);

        if (!button || !buttonText) return;

        if (account) {
            // Adresse für die Anzeige kürzen
            buttonText.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
            button.classList.add('connected');
        } else {
            buttonText.textContent = 'WALLET VERBINDEN';
            button.classList.remove('connected');
        }
    }

    public showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // Einfache Implementierung - kann durch aufwändigere ersetzt werden
        const alertTypes = {
            success: 'Erfolg: ',
            error: 'Fehler: ',
            info: 'Info: ',
        };

        alert(alertTypes[type] + message);
    }
}
