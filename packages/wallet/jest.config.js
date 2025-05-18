export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/tests/**/*.test.ts'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts'
    ],
    transform: {
        '^.+\\.ts$': ['ts-jest']
    },
    moduleNameMapper: {
        // Pfadaliase aus der Paket-tsconfig.json
    }
};