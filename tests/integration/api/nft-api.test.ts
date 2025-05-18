// tests/integration/api/nft-api.test.ts
import { setupMockServer, teardownMockServer } from '../utils/mock-server';

import { fetchUserNFTs, fetchNFTMetadata } from '@/lib/api/nft-api';

describe('NFT API Integration', () => {
    let mockServer;

    beforeAll(async () => {
        mockServer = await setupMockServer();
    });

    afterAll(async () => {
        await teardownMockServer(mockServer);
    });

    it('fetches user NFTs from the API', async () => {
        const userAddress = '0x1234...';
        const nfts = await fetchUserNFTs(userAddress);

        expect(nfts).toBeInstanceOf(Array);
        expect(nfts.length).toBeGreaterThan(0);
        expect(nfts[0]).toHaveProperty('id');
        expect(nfts[0]).toHaveProperty('tokenURI');
    });

    it('fetches and processes NFT metadata', async () => {
        const tokenURI = 'ipfs://Qm...';
        const metadata = await fetchNFTMetadata(tokenURI);

        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('image');
        expect(metadata).toHaveProperty('attributes');
    });
});