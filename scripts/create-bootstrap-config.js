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

import fs from "fs";
import path from 'path';
import { logger } from "./utils/logger.js";
import { loadJsonFile, writeJsonFile } from "./utils/json-handling.js";
import { ensureDirectoryExists } from "./utils/path-utils.js";
import { fetchCDNInfo } from "./utils/cdn-resolver.js";

/**
 * Cache manager für CDN Informationen
 */
class CDNInfoCache {
  /**
   * Erstellt eine neue Cache-Instanz
   * @param {string} cacheDir - Pfad zum Cache-Verzeichnis
   * @param {number} cacheTTL - Cache-Gültigkeit in Millisekunden (default: 7 Tage)
   */
  constructor(cacheDir, cacheTTL = 7 * 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.cacheTTL = cacheTTL;
    this.cacheFile = path.join(cacheDir, 'cdn-info-cache.json');
    this.cache = this.loadCache();
    
    // Cache-Wartung bei jedem Start
    this.cleanupExpiredEntries();
  }
  
  /**
   * Lädt den Cache aus der Datei
   * @returns {Object} Cache-Inhalt
   */
  loadCache() {
    ensureDirectoryExists(this.cacheDir);
    
    if (fs.existsSync(this.cacheFile)) {
      try {
        const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        logger.info(`Loaded CDN info cache with ${Object.keys(cacheData).length} entries`);
        return cacheData;
      } catch (error) {
        logger.warn(`Error loading cache file, creating new cache: ${error.message}`);
        return {};
      }
    }
    
    logger.info('No CDN info cache found, creating new cache');
    return {};
  }
  
  /**
   * Speichert den Cache in die Datei
   */
  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      logger.warn(`Error saving cache file: ${error.message}`);
    }
  }
  
  /**
   * Generiert einen Schlüssel für die Cache-Einträge
   * @param {string} libraryName - Name der Bibliothek
   * @param {string} version - Version der Bibliothek
   * @returns {string} Cache-Schlüssel
   */
  getCacheKey(libraryName, version) {
    return `${libraryName}@${version}`;
  }
  
  /**
   * Prüft ob ein Eintrag im Cache existiert und noch gültig ist
   * @param {string} libraryName - Name der Bibliothek
   * @param {string} version - Version der Bibliothek
   * @returns {boolean} True wenn ein gültiger Eintrag existiert
   */
  hasValidEntry(libraryName, version) {
    const key = this.getCacheKey(libraryName, version);
    const entry = this.cache[key];
    
    if (!entry) return false;
    
    const now = Date.now();
    return entry.timestamp + this.cacheTTL > now;
  }
  
  /**
   * Holt CDN-Informationen aus dem Cache
   * @param {string} libraryName - Name der Bibliothek
   * @param {string} version - Version der Bibliothek
   * @returns {Object|null} CDN-Informationen oder null wenn nicht im Cache
   */
  get(libraryName, version) {
    const key = this.getCacheKey(libraryName, version);
    const entry = this.cache[key];
    
    if (!entry) return null;
    
    const now = Date.now();
    if (entry.timestamp + this.cacheTTL < now) {
      // Eintrag ist abgelaufen
      delete this.cache[key];
      this.saveCache();
      return null;
    }
    
    logger.info(`Using cached CDN info for ${key}`);
    return entry.data;
  }
  
  /**
   * Speichert CDN-Informationen im Cache
   * @param {string} libraryName - Name der Bibliothek
   * @param {string} version - Version der Bibliothek
   * @param {Object} data - CDN-Informationen
   */
  set(libraryName, version, data) {
    const key = this.getCacheKey(libraryName, version);
    this.cache[key] = {
      timestamp: Date.now(),
      data
    };
    
    this.saveCache();
    logger.info(`Cached CDN info for ${key}`);
  }
  
  /**
   * Entfernt abgelaufene Einträge aus dem Cache
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const key in this.cache) {
      if (this.cache[key].timestamp + this.cacheTTL < now) {
        delete this.cache[key];
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info(`Removed ${removedCount} expired entries from CDN info cache`);
      this.saveCache();
    }
  }
}

/**
 * Holt CDN-Informationen mit Cache-Unterstützung
 * @param {string} libraryName - Name der Bibliothek
 * @param {string} version - Version der Bibliothek 
 * @param {CDNInfoCache} cache - Cache-Instanz
 * @returns {Promise<Object>} CDN-Informationen
 */
async function getCachedCDNInfo(libraryName, version, cache) {
  // Zuerst im Cache nachsehen
  if (cache.hasValidEntry(libraryName, version)) {
    return cache.get(libraryName, version);
  }
  
  // Wenn nicht im Cache, dann von CDN holen
  logger.info(`Fetching fresh CDN information for ${libraryName}@${version}...`);
  const cdnInfo = await fetchCDNInfo(libraryName, version);
  
  // Im Cache speichern
  cache.set(libraryName, version, cdnInfo);
  
  return cdnInfo;
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
                "timeout": 5000,
                "cacheDir": ".cache"
            }
        };
        logger.info("Created new project-config.json with default values");
        writeJsonFile(projectConfigPath, projectConfig);
    }

    // Cache-Konfiguration
    const cacheDir = projectConfig.settings?.cacheDir || ".cache";
    const cachePath = path.resolve(process.cwd(), cacheDir);
    const cdnCache = new CDNInfoCache(cachePath);

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

    // Für jede selbst-gehostete Bibliothek
    for (const libName of selfHostedLibraries) {
        if (dependencies[libName]) {
            const version = dependencies[libName].replace(/[^0-9.]/g, '');
            logger.info(`Library '${libName}' found in version ${version}`);
        
            // CDN-Informationen mit Cache-Unterstützung holen
            const cdnInfo = await getCachedCDNInfo(libName, version, cdnCache);
        
            if (cdnInfo.sources && cdnInfo.sources.length > 0) {
                logger.success(`Found ${cdnInfo.sources.length} CDN sources for ${libName}`);
            
                foundLibraries[libName] = {
                    localPath: `/lib/${libName}.js`,
                    // Verwende die erste (beste) CDN-URL
                    cdnPath: cdnInfo.sources[0].url,
                    // Speichere alle alternativen CDN-Quellen
                    alternativeCDNs: cdnInfo.sources.slice(1).map(source => source.url),
                    cdnProvider: cdnInfo.sources[0].name,
                    description: `Automatically configured library from package.json`
                };
            
                // Optional: Zusätzliche Metadaten speichern
                if (cdnInfo.browserCompatible === false) {
                    logger.warn(`Library ${libName} might not be fully browser-compatible`);
                    foundLibraries[libName].browserCompatible = false;
                }
            } else {
                logger.warn(`No CDN sources found for ${libName}, using default jsDelivr URL`);
                foundLibraries[libName] = {
                    localPath: `/lib/${libName}.js`,
                    cdnPath: `https://cdn.jsdelivr.net/npm/${libName}@${version}`,
                    cdnProvider: 'jsdelivr-fallback',
                    description: `Automatically configured library from package.json (no CDN info found)`
                };
            }
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
        timeout: 5000,
        cacheDir: ".cache"
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