// tests/unit/setup.ts
import '@testing-library/jest-dom';

// Mocks
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));