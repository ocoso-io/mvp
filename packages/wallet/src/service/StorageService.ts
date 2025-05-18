export class StorageService {
    private prefix = 'wallet_v1_';

    public saveItem(key: string, value: unknown): void {
        try {
            const storageKey = this.prefix + key;
            const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(storageKey, valueToStore);
        } catch (error) {
            console.warn(`Fehler beim Speichern von ${key}:`, error);
        }
    }

    public getItem<T>(key: string, defaultValue: T): T {
        try {
            const storageKey = this.prefix + key;
            const storedValue = localStorage.getItem(storageKey);

            if (storedValue === null) return defaultValue;

            try {
                return JSON.parse(storedValue) as T;
            } catch {
                return storedValue as unknown as T;
            }
        } catch (error) {
            console.warn(`Fehler beim Abrufen von ${key}:`, error);
            return defaultValue;
        }
    }

    public removeItem(key: string): void {
        try {
            const storageKey = this.prefix + key;
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn(`Fehler beim Entfernen von ${key}:`, error);
        }
    }
}
