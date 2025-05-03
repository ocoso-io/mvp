#!/usr/bin/env node
// generate-rollup-config.js

const fs = require('fs');
const path = require('path');

// Konsole-Farben für bessere Lesbarkeit
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

// Logger für bessere Konsolenausgabe
const logger = {
    info: (msg) => console.log(`${colors.blue}INFO:${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}SUCCESS:${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}WARNING:${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}ERROR:${colors.reset} ${msg}`),
    heading: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    separator: () => console.log("----------------------------------------")
};

// Funktion zum Laden und Parsen von JSON-Dateien
function loadJsonFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.error(`File ${filePath} doesn't exist.`);
            return null;
        }
        logger.error(`Error loading ${filePath}: ${error.message}`);
        process.exit(1);
    }
}

// Stellt sicher, dass ein Verzeichnis existiert
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.info(`Created directory: ${dirPath}`);
        } catch (error) {
            logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
            process.exit(1);
        }
    }
}

// Funktion zum Schreiben von JavaScript-Modulen
function writeJsModule(filePath, data) {
    try {
        // Stelle sicher, dass das Verzeichnis existiert
        const dirPath = path.dirname(filePath);
        ensureDirectoryExists(dirPath);

        fs.writeFileSync(filePath, data, 'utf8');
        logger.success(`File ${filePath} successfully written`);
        return true;
    } catch (error) {
        logger.error(`Error writing ${filePath}: ${error.message}`);
        process.exit(1);
    }
}

// Hauptfunktion
function main() {
    logger.heading("ROLLUP CONFIGURATION GENERATOR");

    // Dateipfade
    const bootstrapConfigPath = path.resolve(process.cwd(), 'dist/bootstrap-config.json');
    const outputPath = path.resolve(process.cwd(), 'build/rollup-dynamic-config.js');

    // Bootstrap-Konfiguration laden
    logger.info("Loading bootstrap-config.json...");
    const bootstrapConfig = loadJsonFile(bootstrapConfigPath);

    if (!bootstrapConfig) {
        logger.error("Failed to load bootstrap-config.json. Run create-bootstrap-config.js first.");
        process.exit(1);
    }

    // Extrahiere Libraries und Komponenten
    const libraries = bootstrapConfig.libraries || {};
    const components = bootstrapConfig.components || {};

    logger.info(`Found ${Object.keys(libraries).length} libraries and ${Object.keys(components).length} components`);

    // Generiere Rollup-Konfiguration als JavaScript-Modul
    let rollupConfigContent = `// Auto-generated rollup configuration based on bootstrap-config.json
// Generated on ${new Date().toISOString()}
// DO NOT EDIT MANUALLY

// Export library configs
export const libraryConfigs = ${JSON.stringify(
        Object.entries(libraries).map(([name, config]) => ({
            name,
            input: `src/lib/${name}-bundle.ts`,
            output: `dist/lib/${name}.js`,
            localPath: config.localPath
        })),
        null, 2
    )};

// Export component configs
export const componentConfigs = ${JSON.stringify(
        Object.entries(components).map(([name, path]) => ({
            name,
            input: `src/components/${name}/index.ts`,
            output: `dist/components/${name}.js`
        })),
        null, 2
    )};

// Export combined configs for easy import
export default {
    libraries: libraryConfigs,
    components: componentConfigs
};
`;

    // Schreibe die Rollup-Konfiguration
    logger.info("Generating rollup-dynamic-config.js...");
    writeJsModule(outputPath, rollupConfigContent);

    logger.separator();
    logger.success("Dynamic Rollup configuration successfully generated!");
    logger.info(`Configuration file: ${outputPath}`);
    logger.info("You can now import this in your rollup.config.js");
    logger.separator();
}

// Skript ausführen
main();