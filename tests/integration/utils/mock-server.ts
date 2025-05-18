// tests/integration/utils/mock-server.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock-Daten für Tests
const mockNFTs = [
    { id: '1', tokenURI: 'ipfs://QmA...', owner: '0x1234...' },
    { id: '2', tokenURI: 'ipfs://QmB...', owner: '0x1234...' }
];

const mockMetadata = {
    name: 'OCOSO #1',
    description: 'An exclusive NFT...',
    image: 'ipfs://QmC...',
    attributes: [
        { trait_type: 'Rarity', value: 'Legendary' },
        { trait_type: 'Power', value: 100 }
    ]
};

// Handler für API-Anfragen
const handlers = [
    rest.get('https://api.ocoso.io/nfts', (req, res, ctx) => {
        const owner = req.url.searchParams.get('owner');
        if (owner) {
            return res(ctx.json(mockNFTs));
        }
        return res(ctx.status(400));
    }),

    rest.get('https://api.ocoso.io/metadata', (req, res, ctx) => {
        const uri = req.url.searchParams.get('uri');
        if (uri) {
            return res(ctx.json(mockMetadata));
        }
        return res(ctx.status(400));
    })
];

// Server-Setup und Teardown
export const setupMockServer = async () => {
    const server = setupServer(...handlers);
    server.listen();
    return server;
};

export const teardownMockServer = async (server) => {
    server.close();
};