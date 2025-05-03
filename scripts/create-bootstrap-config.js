#!/usr/bin/env node

/**
 * create-bootstrap-config.js
 *
 * This utility script generates bootstrap-config.json by analyzing:
 * - package.json (for dependencies)
 * - project-config.json (for configuration of self-hosted libraries and bundle definitions)
 * - src/components/ (for automatic component detection)
 *
 * It runs automatically before each build to ensure configuration is up-to-date.
 */

const fs = require('fs');
const path = require('path');

// Determine if running in a CI environment
const isCI = process.env.CI === 'true';

// Colored console output for better readability (disabled in CI environments)
const colors = {
    reset: isCI ? '' : "\x1b[0m",
    bright: isCI ? '' : "\x1b[1m",
    dim: isCI ? '' : "\x1b[2m",
    red: isCI ? '' : "\x1b[31m",
    green: isCI ? '' : "\x1b[32m",
    yellow: isCI ? '' : "\x1b[33m",
    blue: isCI ? '' : "\x1b[34m",
    magenta: isCI ? '' : "\x1b[35m",
    cyan: isCI ? '' : "\x1b[36m"
};

// Logger for better console output
const logger = {
    info: (msg) => console.log(`${colors.blue}INFO:${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}SUCCESS:${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}WARNING:${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}ERROR:${colors.reset} ${msg}`),
    heading: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    separator: () => console.log("----------------------------------------")
};

// Ensure a directory exists
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

// Function to load and parse JSON files
function loadJsonFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.info(`File ${filePath} doesn't exist. A new one will be created.`);
            return null;
        }
        logger.error(`Error loading ${filePath}: ${error.message}`);
        process.exit(1);
    }
}

// Function to write to JSON files
function writeJsonFile(filePath, data) {
    try {
        // Ensure the directory exists
        const dirPath = path.dirname(filePath);
        ensureDirectoryExists(dirPath);
        
        const jsonContent = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonContent, 'utf8');
        logger.success(`File ${filePath} successfully written`);
        return true;
    } catch (error) {
        logger.error(`Error writing ${filePath}: ${error.message}`);
        process.exit(1);
    }
}

// Check if configuration has changed
function configHasChanged(oldConfig, newConfig) {
    // Remove metadata that should not affect comparison
    const stripMetadata = (config) => {
        if (!config) return {};
        const stripped = { ...config };
        delete stripped['// DOCUMENTATION'];
        delete stripped['// WARNING'];
        delete stripped['// DATE'];
        return stripped;
    };

    const strippedOld = stripMetadata(oldConfig);
    const strippedNew = stripMetadata(newConfig);

    return JSON.stringify(strippedOld) !== JSON.stringify(strippedNew);
}

// Main function
async function main() {
    logger.heading("BOOTSTRAP CONFIGURATION GENERATOR");
    logger.info("Running as part of the build process");

    // File paths
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const projectConfigPath = path.resolve(process.cwd(), 'project-config.json');
    
    // Define dist directory - changed from 'build' to 'dist'
    const distDir = path.resolve(process.cwd(), 'dist');
    
    // Ensure dist directory exists
    ensureDirectoryExists(distDir);
    
    // Define bootstrap config path in dist directory
    const bootstrapConfigPath = path.resolve(distDir, 'bootstrap-config.json');
    
    const componentsDir = path.resolve(process.cwd(), 'src/components');

    // Load package.json
    logger.info("Loading package.json...");
    const packageJson = loadJsonFile(packageJsonPath);
    if (!packageJson) {
        logger.error("package.json not found - required for dependencies");
        process.exit(1);
    }

    // Load project-config.json or create a new one
    logger.info("Loading project-config.json...");
    let projectConfig = loadJsonFile(projectConfigPath);
    if (!projectConfig) {
        projectConfig = {
            "self-hosted-libraries": [],
            "component-bundles": {
                "basic": [],
                "all": []
            },
            "library-bundles": {
                "basic": [],
                "all": []
            },
            "settings": {
                "logLevel": "info",
                "useCDNFallback": true,
                "timeout": 5000
            }
        };
        logger.info("Created new project-config.json with default values");
        writeJsonFile(projectConfigPath, projectConfig);
    }

    // Load existing bootstrap-config.json if it exists in dist directory
    logger.info("Checking for existing bootstrap-config.json...");
    const existingBootstrapConfig = loadJsonFile(bootstrapConfigPath);

    // Default bootstrap config
    let bootstrapConfig = {
        "libraries": {},
        "components": {},
        "componentGroups": {},
        "libraryGroups": {},
        "settings": {}
    };

    // 1. Process libraries
    logger.heading("PROCESSING LIBRARIES");

    // All self-hosted libraries from project-config.json
    const selfHostedLibraries = new Set(projectConfig["self-hosted-libraries"] || []);
    logger.info(`Found ${selfHostedLibraries.size} self-hosted libraries`);

    // Found libraries
    const foundLibraries = {};

    // Process dependencies from package.json
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const libName of selfHostedLibraries) {
        if (dependencies[libName]) {
            const version = dependencies[libName].replace(/[^0-9.]/g, '');
            logger.success(`Library '${libName}' found in version ${version}`);
            foundLibraries[libName] = {
                localPath: `/lib/${libName}.js`,
                cdnPath: `https://cdn.jsdelivr.net/npm/${libName}@${version}/dist/index.min.js`,
                description: `Automatically configured library from package.json`
            };
        } else {
            logger.warn(`Library '${libName}' specified in project-config.json but not found in package.json!`);
        }
    }

    // 2. Process components
    logger.heading("PROCESSING COMPONENTS");

    const components = {};
    if (fs.existsSync(componentsDir)) {
        const componentDirs = fs.readdirSync(componentsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        logger.info(`Found ${componentDirs.length} component directories`);

        for (const componentName of componentDirs) {
            const componentIndexPath = path.join(componentsDir, componentName, 'index.ts');
            const componentJsPath = path.join(componentsDir, componentName, 'index.js');

            if (fs.existsSync(componentIndexPath) || fs.existsSync(componentJsPath)) {
                components[componentName] = `/components/${componentName}.js`;
                logger.success(`Component '${componentName}' found`);
            } else {
                logger.warn(`Directory '${componentName}' doesn't contain an index.ts or index.js file`);
            }
        }
    } else {
        logger.warn(`Components directory ${componentsDir} not found!`);
    }

    // 3. Process bundle definitions
    logger.heading("PROCESSING BUNDLE DEFINITIONS");

    // Process component groups
    const componentGroups = {};
    if (projectConfig["component-bundles"]) {
        for (const [groupName, componentList] of Object.entries(projectConfig["component-bundles"])) {
            const validComponents = [];
            let invalidFound = false;

            for (const componentName of componentList) {
                if (components[componentName]) {
                    validComponents.push(componentName);
                } else {
                    logger.warn(`Component '${componentName}' in bundle '${groupName}' not found, skipping`);
                    invalidFound = true;
                }
            }

            componentGroups[groupName] = validComponents;
            logger.success(`Component bundle '${groupName}' created with ${validComponents.length} valid components${
                invalidFound ? ' (some components were skipped)' : ''}`);
        }
    }

    // Process library groups
    const libraryGroups = {};
    if (projectConfig["library-bundles"]) {
        for (const [groupName, libraryList] of Object.entries(projectConfig["library-bundles"])) {
            const validLibraries = [];
            let invalidFound = false;

            for (const libraryName of libraryList) {
                if (foundLibraries[libraryName]) {
                    validLibraries.push(libraryName);
                } else {
                    logger.warn(`Library '${libraryName}' in bundle '${groupName}' not found, skipping`);
                    invalidFound = true;
                }
            }

            libraryGroups[groupName] = validLibraries;
            logger.success(`Library bundle '${groupName}' created with ${validLibraries.length} valid libraries${
                invalidFound ? ' (some libraries were skipped)' : ''}`);
        }
    }

    // Update "all" groups if they exist
    if (componentGroups["all"] !== undefined) {
        componentGroups["all"] = Object.keys(components);
        logger.info(`Updated component bundle 'all' with all ${componentGroups["all"].length} found components`);
    }

    if (libraryGroups["all"] !== undefined) {
        libraryGroups["all"] = Object.keys(foundLibraries);
        logger.info(`Updated library bundle 'all' with all ${libraryGroups["all"].length} found libraries`);
    }

    // 4. Apply settings from project-config
    const settings = projectConfig.settings || {
        logLevel: "info",
        useCDNFallback: true,
        timeout: 5000
    };

    // 5. Create the new bootstrap config
    const newBootstrapConfig = {
        "// DOCUMENTATION": "This file was automatically generated by create-bootstrap-config.js.",
        "// WARNING": "Manual changes will be overwritten when the script is run again.",
        "// DATE": new Date().toISOString(),

        "// libraries": "Configuration of libraries with local and CDN paths",
        "libraries": foundLibraries,

        "// components": "Paths to web components",
        "components": components,

        "// componentGroups": "Predefined groups of components for easy loading",
        "componentGroups": componentGroups,

        "// libraryGroups": "Predefined groups of libraries for easy loading",
        "libraryGroups": libraryGroups,

        "// settings": "General settings for the bootstrap system",
        "settings": settings
    };

    // 6. Check if configuration has changed
    if (!configHasChanged(existingBootstrapConfig, newBootstrapConfig)) {
        logger.info("Configuration hasn't changed - keeping existing bootstrap-config.json");
        return;
    }

    // 7. Save configuration to dist directory
    logger.heading("SAVING CONFIGURATION");
    writeJsonFile(bootstrapConfigPath, newBootstrapConfig);

    // Print summary
    logger.separator();
    logger.heading("SUMMARY");
    logger.info(`${Object.keys(foundLibraries).length} libraries configured`);
    logger.info(`${Object.keys(components).length} components found`);
    logger.info(`${Object.keys(componentGroups).length} component bundles defined`);
    logger.info(`${Object.keys(libraryGroups).length} library bundles defined`);
    logger.separator();
    logger.success(`bootstrap-config.json successfully created in dist directory!`);

    // Recommended next steps
    if (Object.keys(foundLibraries).length === 0) {
        logger.info("Tip: Add libraries to 'self-hosted-libraries' in project-config.json");
    }

    if (Object.keys(components).length === 0) {
        logger.info("Tip: Create components in the src/components/ directory");
    }
}

// Run script
main().catch(error => {
    logger.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});