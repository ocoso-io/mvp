import { NetworkValidationError } from '../errors';
import { NetworkInfo, NETWORK_INFO } from '../networks';

export class NetworkValidator {
    private supportedChainIds: number[];

    constructor(supportedChainIds: number[]) {
        this.supportedChainIds = supportedChainIds;
    }

    public isChainIdSupported(chainId: number): boolean {
        return this.supportedChainIds.includes(chainId);
    }

    public validateChainId(chainId: number): void {
        if (!this.isChainIdSupported(chainId)) {
            const supportedNetworks = this.getSupportedNetworkNames();
            throw new NetworkValidationError(
                `Nicht unterstütztes Netzwerk. Bitte wechsle zu einem der folgenden Netzwerke: ${supportedNetworks}`,
                chainId
            );
        }
    }

    public getNetworkInfo(chainId: number): NetworkInfo | null {
        return NETWORK_INFO[chainId] || null;
    }

    private getSupportedNetworkNames(): string {
        return this.supportedChainIds
            .map(id => {
                const info = this.getNetworkInfo(id);
                return info ? info.name : `Chain ID ${id}`;
            })
            .join(', ');
    }
}
