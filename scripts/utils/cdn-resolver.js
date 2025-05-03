/**
 * cdn-resolver.js
 *
 * This module provides functions for programmatically determining CDN URLs
 * for JavaScript libraries based on names and versions, with browser compatibility checks.
 */

import { logger } from './logger.js';

/**
 * CDN Provider interface
 * @typedef {Object} CDNProvider
 * @property {function(string, string): Promise<string>} getUrl - Get URL for library
 * @property {function(): string} getName - Get provider name
 * @property {function(): number} getPriority - Get provider priority
 * @property {function(string, string): Promise<boolean>} verifyLibraryExists - Check if library exists
 */

/**
 * Browser compatibility checker interface
 * @typedef {Object} CompatibilityChecker
 * @property {function(string, string): Promise<Object>} checkCompatibility - Check browser compatibility
 */

/**
 * HTTP client interface for external requests
 * @typedef {Object} HttpClient
 * @property {function(string): Promise<Object>} get - GET request
 * @property {function(string): Promise<boolean>} head - HEAD request
 */

/**
 * Default HTTP client implementation
 */
export class FetchHttpClient {
  /**
   * Performs a GET request
   * @param {string} url - URL to request
   * @returns {Promise<Object>} Response object with json() and text() methods
   */
  async get(url) {
    try {
      const response = await fetch(url);
      return {
        ok: response.ok,
        status: response.status,
        json: async () => response.ok ? await response.json() : null,
        text: async () => response.ok ? await response.text() : null
      };
    } catch (error) {
      logger.error(`GET request failed for ${url}: ${error.message}`);
      return { ok: false, status: 0, json: async () => null, text: async () => null };
    }
  }

  /**
   * Performs a HEAD request to check if URL exists
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} True if URL exists
   */
  async head(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * CDN Resolver factory
 */
export class CDNResolverFactory {
  /**
   * Creates a new CDN Resolver
   * @param {HttpClient} httpClient - HTTP client for making requests
   * @param {Array<CDNProvider>} cdnProviders - CDN providers
   * @param {CompatibilityChecker} compatibilityChecker - Browser compatibility checker
   * @returns {CDNResolver} New CDN resolver instance
   */
  static create(
    httpClient = new FetchHttpClient(),
    cdnProviders = defaultCdnProviders(httpClient),
    compatibilityChecker = new PackageCompatibilityChecker(httpClient)
  ) {
    return new CDNResolver(httpClient, cdnProviders, compatibilityChecker);
  }
}

/**
 * Main CDN resolver class
 */
export class CDNResolver {
  /**
   * Creates a new CDN resolver
   * @param {HttpClient} httpClient - HTTP client for making requests
   * @param {Array<CDNProvider>} cdnProviders - List of CDN providers
   * @param {CompatibilityChecker} compatibilityChecker - Browser compatibility checker
   */
  constructor(httpClient, cdnProviders, compatibilityChecker) {
    this.httpClient = httpClient;
    this.cdnProviders = cdnProviders;
    this.compatibilityChecker = compatibilityChecker;
  }

  /**
   * Fetch CDN information for a library
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @returns {Promise<Object>} CDN information
   */
  async fetchCDNInfo(libraryName, version) {
    logger.info(`Fetching CDN information for ${libraryName}@${version}...`);
    
    const compatibilityInfo = await this.compatibilityChecker.checkCompatibility(libraryName, version);
    const cdnSources = await this.collectCdnSources(libraryName, version, compatibilityInfo);
    
    // Sort by priority
    cdnSources.sort((a, b) => a.priority - b.priority);
    
    // Add compatibility info to result
    const result = {
      sources: cdnSources,
      browserCompatible: compatibilityInfo.compatible,
      isESM: compatibilityInfo.esModule,
      hasNodeDependencies: compatibilityInfo.hasNodeDependencies,
      packageInfo: compatibilityInfo.packageJson
    };
    
    this.logResult(result, libraryName, version, compatibilityInfo);
    
    return result;
  }
  
  /**
   * Collect CDN sources for a library
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @param {Object} compatibilityInfo - Compatibility information
   * @returns {Promise<Array>} List of CDN sources
   */
  async collectCdnSources(libraryName, version, compatibilityInfo) {
    const cdnSources = [];
    
    // If we have a recommended URL from compatibility check, prioritize it
    if (compatibilityInfo.compatible && compatibilityInfo.recommendedUrl) {
      const urlParts = compatibilityInfo.recommendedUrl.split('/');
      const cdnName = urlParts[2].split('.')[0]; // Extract CDN name from domain
      
      cdnSources.push({
        name: cdnName,
        url: compatibilityInfo.recommendedUrl,
        priority: 1,
        verified: true,
        browserCompatible: true,
        filePath: compatibilityInfo.recommendedPath || ''
      });
    }
    
    // Check each CDN provider
    for (const provider of this.cdnProviders) {
      try {
        const exists = await provider.verifyLibraryExists(libraryName, version);
        
        if (exists) {
          const url = await provider.getUrl(libraryName, version);
          
          cdnSources.push({
            name: provider.getName(),
            url,
            priority: cdnSources.length > 0 ? cdnSources.length + 1 : provider.getPriority(),
            verified: true,
            browserCompatible: compatibilityInfo.compatible
          });
        }
      } catch (error) {
        logger.warn(`Error checking CDN provider ${provider.getName()}: ${error.message}`);
      }
    }
    
    return cdnSources;
  }
  
  /**
   * Log the result of CDN resolution
   * @param {Object} result - Resolution result
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @param {Object} compatibilityInfo - Compatibility information
   */
  logResult(result, libraryName, version, compatibilityInfo) {
    if (result.browserCompatible) {
      logger.success(`Found browser-compatible CDN options for ${libraryName}@${version}`);
    } else if (compatibilityInfo.potentiallyIncompatible) {
      logger.warn(`${libraryName}@${version} might not be fully browser-compatible, but we'll try to use it anyway`);
    } else {
      logger.warn(`${libraryName}@${version} doesn't appear to be intended for browser usage`);
    }
  }
  
  /**
   * Generate SRI hash for a URL
   * @param {string} url - URL to generate hash for
   * @returns {Promise<string|null>} SRI hash or null on error
   */
  async generateSriHash(url) {
    logger.info(`Generating SRI hash for ${url}...`);
    
    try {
      const response = await this.httpClient.get(url);
      if (!response.ok) {
        logger.error(`Failed to fetch ${url} for SRI hash generation`);
        return null;
      }

      const content = await response.text();
      
      // Use Web Crypto API for the hash
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-384', data);

      // Convert ArrayBuffer to base64 string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
      
      const sriHash = `sha384-${hashBase64}`;
      logger.success(`Generated SRI hash for ${url}`);
      
      return sriHash;
    } catch (error) {
      logger.error(`Error generating SRI hash for ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * Implementation of browser compatibility checker
 */
export class PackageCompatibilityChecker {
  /**
   * Create a new package compatibility checker
   * @param {HttpClient} httpClient - HTTP client
   */
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  
  /**
   * Check browser compatibility of a package
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @returns {Promise<Object>} Compatibility information
   */
  async checkCompatibility(libraryName, version) {
    logger.info(`Checking browser compatibility for ${libraryName}@${version}...`);
    
    try {
      // Get package.json
      const packageJson = await this.getPackageJson(libraryName, version);
      if (!packageJson) {
        return { compatible: false, reason: "Package not found" };
      }
      
      // Check browser-specific fields
      const hasBrowserField = !!packageJson.browser;
      const hasUmdBuild = this.hasUmdBuild(packageJson);
      const isESM = packageJson.type === "module" || !!packageJson.module;
      
      // Get distribution files
      const files = await this.listDistributionFiles(libraryName, version);
      const browserFiles = this.filterBrowserFiles(files);
      const hasBrowserDist = browserFiles.length > 0;
      
      // Check for Node.js dependencies
      const hasNodeDependencies = this.hasNodeDependencies(packageJson);
      
      // Determine compatibility
      const isBrowserCompatible = hasBrowserField || hasUmdBuild || isESM || hasBrowserDist;
      const isPotentiallyIncompatible = hasNodeDependencies && !hasBrowserField && !hasBrowserDist;
      
      // Find recommended URL
      const recommendation = this.getRecommendedUrl(
        libraryName, version, 
        { hasBrowserField, hasUmdBuild, isESM, hasBrowserDist },
        { packageJson, browserFiles }
      );
      
      this.logCompatibilityDetails(
        libraryName, version,
        isBrowserCompatible,
        { hasBrowserField, hasUmdBuild, isESM, hasBrowserDist, hasNodeDependencies }
      );
      
      return {
        compatible: isBrowserCompatible,
        potentiallyIncompatible: isPotentiallyIncompatible,
        esModule: isESM,
        hasBrowserField,
        hasUmdBuild,
        hasBrowserDistribution: hasBrowserDist,
        hasNodeDependencies,
        recommendedUrl: recommendation.url,
        recommendedPath: recommendation.path,
        browserFiles,
        packageJson: {
          main: packageJson.main,
          browser: packageJson.browser,
          module: packageJson.module,
          type: packageJson.type
        }
      };
    } catch (error) {
      logger.error(`Error checking browser compatibility for ${libraryName}@${version}: ${error.message}`);
      return { 
        compatible: false, 
        reason: "Error during compatibility check",
        error: error.message 
      };
    }
  }
  
  /**
   * Get package.json for a library
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @returns {Promise<Object|null>} Package.json content or null
   */
  async getPackageJson(libraryName, version) {
    const packageUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}/package.json`;
    const response = await this.httpClient.get(packageUrl);
    
    if (!response.ok) {
      logger.error(`Package not found: ${libraryName}@${version}`);
      return null;
    }
    
    return await response.json();
  }
  
  /**
   * Check if package has UMD build
   * @param {Object} packageJson - Package.json content
   * @returns {boolean} True if package has UMD build
   */
  hasUmdBuild(packageJson) {
    return packageJson.main && (
      packageJson.main.includes('/umd/') || 
      (packageJson.main.includes('/dist/') && packageJson.main.endsWith('.min.js'))
    );
  }
  
  /**
   * Check if package has Node.js dependencies
   * @param {Object} packageJson - Package.json content
   * @returns {boolean} True if package has Node.js dependencies
   */
  hasNodeDependencies(packageJson) {
    const nodeLibs = ['fs', 'path', 'crypto', 'stream', 'http', 'child_process', 'os'];
    return packageJson.dependencies && Object.keys(packageJson.dependencies).some(
      dep => nodeLibs.includes(dep)
    );
  }
  
  /**
   * List distribution files for a library
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @returns {Promise<Array<string>>} List of distribution files
   */
  async listDistributionFiles(libraryName, version) {
    const commonPaths = ['/dist', '/umd', '/browser', '/lib', '/build'];
    const files = [];
    
    for (const path of commonPaths) {
      try {
        const url = `https://data.jsdelivr.com/v1/package/npm/${libraryName}@${version}/flat${path}`;
        const response = await this.httpClient.get(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.files) {
            const jsFiles = data.files
              .filter(file => typeof file === 'string' && file.endsWith('.js'))
              .map(file => `${path}${file}`);
              
            files.push(...jsFiles);
            
            if (jsFiles.length > 0) {
              logger.info(`Found ${jsFiles.length} JavaScript files in ${path}/`);
            }
          }
        }
      } catch (error) {
        // Ignore errors for individual paths
      }
    }
    
    return files;
  }
  
  /**
   * Filter files to find browser-compatible files
   * @param {Array<string>} files - List of files
   * @returns {Array<string>} List of browser-compatible files
   */
  filterBrowserFiles(files) {
    return files.filter(file => 
      (file.includes('/dist/') && file.endsWith('.min.js')) ||
      (file.includes('/dist/') && file.endsWith('.js') && !file.includes('/esm/') && !file.includes('/cjs/')) ||
      file.includes('/umd/') ||
      file.includes('/browser/') ||
      file.endsWith('.bundle.js')
    );
  }
  
  /**
   * Get recommended URL for a library
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @param {Object} flags - Feature flags
   * @param {Object} data - Additional data
   * @returns {Object} Recommended URL and path
   */
  getRecommendedUrl(libraryName, version, flags, data) {
    const { hasBrowserField, hasUmdBuild, isESM, hasBrowserDist } = flags;
    const { packageJson, browserFiles } = data;
    
    let url = null;
    let path = null;
    
    if (hasBrowserField && typeof packageJson.browser === 'string') {
      // Use browser field if it's a string
      path = packageJson.browser;
      url = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${packageJson.browser}`;
      logger.success(`Found browser field in package.json: ${packageJson.browser}`);
    } else if (hasUmdBuild) {
      // Use UMD build
      path = packageJson.main;
      url = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${packageJson.main}`;
      logger.success(`Found UMD build in package.json main: ${packageJson.main}`);
    } else if (hasBrowserDist && browserFiles.length > 0) {
      // Sort browser files by priority
      const sortedFiles = this.sortBrowserFilesByPriority(browserFiles);
      path = sortedFiles[0];
      url = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${sortedFiles[0]}`;
      logger.success(`Found browser distribution file: ${sortedFiles[0]}`);
    } else if (isESM) {
      // For ESM modules we prefer Skypack
      url = `https://cdn.skypack.dev/${libraryName}@${version}`;
      logger.success(`Package is ESM compatible, using Skypack for browser conversion`);
    } else if (packageJson.dependencies) {
      // For potentially incompatible libraries, use Skypack
      url = `https://cdn.skypack.dev/${libraryName}@${version}`;
      logger.warn(`Package has Node.js dependencies, using Skypack which will try to polyfill them`);
    }
    
    return { url, path };
  }
  
  /**
   * Sort browser files by priority
   * @param {Array<string>} files - Browser files
   * @returns {Array<string>} Sorted files
   */
  sortBrowserFilesByPriority(files) {
    return [...files].sort((a, b) => {
      // Prefer minified dist files
      if (a.includes('/dist/') && a.endsWith('.min.js')) return -1;
      if (b.includes('/dist/') && b.endsWith('.min.js')) return 1;
      // Then prefer any dist files
      if (a.includes('/dist/')) return -1;
      if (b.includes('/dist/')) return 1;
      // Then prefer UMD
      if (a.includes('/umd/')) return -1;
      if (b.includes('/umd/')) return 1;
      // Then prefer minified files
      if (a.endsWith('.min.js')) return -1;
      if (b.endsWith('.min.js')) return 1;
      return 0;
    });
  }
  
  /**
   * Log compatibility details
   * @param {string} libraryName - Library name
   * @param {string} version - Library version
   * @param {boolean} isCompatible - Is browser compatible
   * @param {Object} flags - Feature flags
   */
  logCompatibilityDetails(libraryName, version, isCompatible, flags) {
    const { hasBrowserField, hasUmdBuild, isESM, hasBrowserDist, hasNodeDependencies } = flags;
    
    if (isCompatible) {
      logger.info(`Browser compatibility details for ${libraryName}@${version}:`);
      if (hasBrowserField) logger.info(`- Has browser field in package.json`);
      if (hasUmdBuild) logger.info(`- Has UMD build`);
      if (isESM) logger.info(`- Is ESM compatible`);
      if (hasBrowserDist) logger.info(`- Has browser distribution files`);
    }
    
    if (hasNodeDependencies) {
      logger.warn(`${libraryName}@${version} has Node.js specific dependencies which might not work in browser`);
    }
  }
}

/**
 * Create default CDN providers
 * @param {HttpClient} httpClient - HTTP client
 * @returns {Array<CDNProvider>} List of CDN providers
 */
function defaultCdnProviders(httpClient) {
  return [
    // Skypack CDN (converts to ESM)
    {
      getName: () => 'skypack',
      getPriority: () => 1,
      getUrl: (name, version) => `https://cdn.skypack.dev/${name}@${version}`,
      verifyLibraryExists: async (name, version) => {
        return await httpClient.head(`https://cdn.skypack.dev/${name}@${version}`);
      }
    },
    // ESM.sh CDN (converts to ESM)
    {
      getName: () => 'esm.sh',
      getPriority: () => 2,
      getUrl: (name, version) => `https://esm.sh/${name}@${version}`,
      verifyLibraryExists: async (name, version) => {
        return await httpClient.head(`https://esm.sh/${name}@${version}`);
      }
    },
    // jsDelivr CDN
    {
      getName: () => 'jsdelivr',
      getPriority: () => 3,
      getUrl: (name, version) => `https://cdn.jsdelivr.net/npm/${name}@${version}`,
      verifyLibraryExists: async (name, version) => {
        return await httpClient.head(`https://cdn.jsdelivr.net/npm/${name}@${version}`);
      }
    },
    // UNPKG CDN
    {
      getName: () => 'unpkg',
      getPriority: () => 4,
      getUrl: (name, version) => `https://unpkg.com/${name}@${version}`,
      verifyLibraryExists: async (name, version) => {
        return await httpClient.head(`https://unpkg.com/${name}@${version}`);
      }
    }
  ];
}

// Expose a pre-configured resolver as a convenience
const defaultResolver = CDNResolverFactory.create();

/**
 * Fetch CDN information for a library (convenience method using default resolver)
 * @param {string} libraryName - Library name
 * @param {string} version - Library version
 * @returns {Promise<Object>} CDN information
 */
export async function fetchCDNInfo(libraryName, version) {
  return await defaultResolver.fetchCDNInfo(libraryName, version);
}

/**
 * Generate SRI hash for a URL (convenience method using default resolver)
 * @param {string} url - URL to generate hash for
 * @returns {Promise<string|null>} SRI hash or null on error
 */
export async function generateSriHash(url) {
  return await defaultResolver.generateSriHash(url);
}