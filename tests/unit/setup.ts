// tests/unit/setup.ts
import '@testing-library/jest-dom';

// Globale Mocks für Unit-Tests
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));