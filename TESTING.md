# Testing Strategy for OCOSO Staking

## Test Levels

### Unit Tests

- Testing of isolated components and functions
- Fast execution, fully mocked dependencies
- Directory: `tests/unit/`

### Integration Tests

- Testing interaction between multiple components/services
- Verification of workflows and API interactions
- Directory: `tests/integration/`

### E2E Tests

- Testing the entire system from user perspective
- Automated browser tests with Playwright
- Directory: `tests/e2e/`

## Test Commands

```bash
# Unit-Tests
npm run test:unit
npm run test:unit:watch

# Integrationstests
npm run test:integration
npm run test:integration:watch

# E2E-Tests
npm run test:e2e
npm run test:e2e:ui

# All Tests (Unit + Integration + Workspace-Tests)
npm run test:all
```

## Example of a Typical Integration Test

For a service that combines Web3 functionality and data storage:

```typescript
// tests/integration/services/staking-integration.test.ts
import { initializeStakingService } from '@/services/staking-service';
import { getLocalStorageProvider } from '@/lib/storage';
import { getMockWeb3Provider } from '../utils/mock-web3';

describe('Staking Service Integration', () => {
    // In integration tests we use real versions of some dependencies
    const storageProvider = getLocalStorageProvider('test-namespace');
    const mockWeb3 = getMockWeb3Provider();

    beforeEach(() => {
        // Reset storage before each test
        storageProvider.clear();
        // Reset blockchain simulation
        mockWeb3.reset();
  });
  
  it('persists staking information across sessions', async () => {
    // Initialisieren des Service mit echtem Storage und gemocktem Web3
    const stakingService = initializeStakingService({
      storage: storageProvider,
      web3Provider: mockWeb3
    });

      // Stake NFT
      const result = await stakingService.stakeNFT({
          tokenId: '123',
          contractAddress: '0xabc...'
      });

      expect(result.success).toBe(true);

      // Initialize new service with same storage (simulates new session)
      const newStakingService = initializeStakingService({
          storage: storageProvider,
          web3Provider: mockWeb3
      });

      // Staking information should be preserved
      const stakedNFTs = await newStakingService.getStakedNFTs();
    expect(stakedNFTs).toHaveLength(1);
    expect(stakedNFTs[0].tokenId).toBe('123');
  });
  
  it('calculates rewards correctly based on staking duration', async () => {
    const stakingService = initializeStakingService({
      storage: storageProvider,
      web3Provider: mockWeb3
    });

      // Stake NFT
      await stakingService.stakeNFT({
          tokenId: '123',
          contractAddress: '0xabc...'
      });

      // Advance time (7 days)
      await mockWeb3.advanceTimeBy(7 * 24 * 60 * 60);

      // Calculate rewards
      const rewards = await stakingService.calculateRewards('123');

      // With a reward rate of 10 tokens per day, it should be 70 after 7 days
      expect(rewards).toBe(70);
  });
});
```

With this enhanced test structure, you cover all important test levels:

1. **Unit Tests**: Isolated tests for individual components and functions
2. **Integration Tests**: Tests for the interaction between multiple components
3. **E2E Tests**: Tests of the application from user perspective

This structure enables you to test effectively while maintaining a clear separation between different test types.