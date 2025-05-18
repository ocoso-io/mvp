export class WalletConnectionError extends Error {
    constructor(
        readonly message: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'WalletConnectionError';
    }
}

export class NetworkValidationError extends Error {
    constructor(
        readonly message: string,
        public readonly chainId: number
    ) {
        super(message);
        this.name = 'NetworkValidationError';
    }
}
