export default {
    preset: 'ts-jest',
    testEnvironment: 'node', // Verwenden Sie 'jsdom' wenn nötig
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
    testMatch: [
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.tsx'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json'
        }]
    },
    // Längerer Timeout für Integrationstests
    testTimeout: 30000
};