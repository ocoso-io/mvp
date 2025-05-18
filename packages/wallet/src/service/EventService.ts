import {WalletEvent} from '../types';

export class EventService {
    public dispatchEvent(eventName: WalletEvent, detail?: unknown): void {
        const event = new CustomEvent(eventName, {
            detail: detail || {},
        });
        document.dispatchEvent(event);
    }

    public addListener(eventName: WalletEvent, handler: (event: CustomEvent) => void): void {
        document.addEventListener(eventName as string, handler as EventListener);
    }

    public removeListener(eventName: WalletEvent, handler: (event: CustomEvent) => void): void {
        document.removeEventListener(eventName as string, handler as EventListener);
    }
}
