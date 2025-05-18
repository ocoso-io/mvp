// tests/integration/workflows/staking-workflow.test.ts
import { MockProvider } from '@/lib/providers/mock-provider';
import { getStakingRewards } from '@/services/rewards-service';
import { approveNFT, stakeNFT } from '@/services/staking-service';
import { connectWallet } from '@/services/wallet-service';

describe('Staking Workflow Integration', () => {
    let provider: MockProvider;

    beforeAll(async () => {
        // Setup für die gesamte Testsuite
        await global.setupTestDatabase();
    });

    afterAll(async () => {
        // Teardown für die gesamte Testsuite
        await global.teardownTestDatabase();
    });

    beforeEach(() => {
        provider = new MockProvider();
        // Weiteres Setup
    });

    it('completes full staking workflow', async () => {
        // Diese Tests prüfen, ob verschiedene Services zusammenarbeiten
        const wallet = await connectWallet(provider);
        expect(wallet.isConnected).toBe(true);

        const nftId = '12345';
        const approval = await approveNFT(wallet, nftId);
        expect(approval.success).toBe(true);

        const staking = await stakeNFT(wallet, nftId);
        expect(staking.success).toBe(true);
        expect(staking.transactionHash).toBeTruthy();

        // Simuliere das Vergehen von Zeit
        await provider.advanceTimeBy(86400); // 1 Tag

        const rewards = await getStakingRewards(wallet, nftId);
        expect(rewards).toBeGreaterThan(0);
    });
});