#!/usr/bin/env node
// generate-rollup-config.js

import path from "path";
import {logger} from "./utils/logger.js";
import {loadJsonFile, writeJsModule} from "./utils/json-handling.js";

// Main function
function main() {
    logger.heading("ROLLUP CONFIGURATION GENERATOR");

    // File paths
    const bootstrapConfigPath = path.resolve(process.cwd(), 'dist/bootstrap-config.json');
    const outputPath = path.resolve(process.cwd(), 'build/rollup-dynamic-config.js');

    // Load bootstrap configuration
    logger.info("Loading bootstrap-config.json...");
    const bootstrapConfig = loadJsonFile(bootstrapConfigPath);

    if (!bootstrapConfig) {
        logger.error("Failed to load bootstrap-config.json. Run create-bootstrap-config.js first.");
        process.exit(1);
    }

    // Extract libraries and components
    const libraries = bootstrapConfig.libraries || {};
    const components = bootstrapConfig.components || {};

    logger.info(`Found ${Object.keys(libraries).length} libraries and ${Object.keys(components).length} components`);

    // Generate Rollup configuration as JavaScript module
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

    // Write the Rollup configuration
    logger.info("Generating rollup-dynamic-config.js...");
    writeJsModule(outputPath, rollupConfigContent);

    logger.separator();
    logger.success("Dynamic Rollup configuration successfully generated!");
    logger.info(`Configuration file: ${outputPath}`);
    logger.info("You can now import this in your rollup.config.js");
    logger.separator();
}

// Run script
main();