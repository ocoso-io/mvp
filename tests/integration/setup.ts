// tests/integration/setup.ts
import '@testing-library/jest-dom';

// Globale Hilfsfunktionen
declare global {
  function setupTestDatabase(): Promise<void>;
  function teardownTestDatabase(): Promise<void>;
}

// Implementierung der globalen Funktionen
global.setupTestDatabase = async (): Promise<void> => {
  console.log('Setting up test database...');
};

global.teardownTestDatabase = async (): Promise<void> => {
  console.log('Tearing down test database...');
};