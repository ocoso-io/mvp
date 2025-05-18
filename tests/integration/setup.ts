// tests/integration/setup.ts
import '@testing-library/jest-dom';

// Erweiterte Erwartungen für Integrationstests
expect.extend({
    // Benutzerdefinierte Matcher hier
});

// Globale Test-Umgebungskonfiguration für Integrationstests
global.setupTestDatabase = async () => {
    // Datenbank-Setup-Logik hier
};

global.teardownTestDatabase = async () => {
    // Datenbank-Teardown-Logik hier
};