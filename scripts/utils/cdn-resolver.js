/**
 * cdn-resolver.js
 *
 * This module provides functions for programmatically determining CDN URLs
 * for JavaScript libraries based on names and versions, with browser compatibility checks.
 */

/**
 * Retrieves information about CDN sources for a specific library
 * @param {string} libraryName - Name of the library (npm package name)
 * @param {string} version - Version string of the library
 * @returns {Promise<Array>} Array of CDN sources with URLs and metadata
 */
export async function fetchCDNInfo(libraryName, version) {
    console.info(`Fetching CDN information for ${libraryName}@${version}...`);
    
    // First check browser compatibility
    const compatibilityInfo = await checkBrowserCompatibility(libraryName, version);
    
    const cdnSources = [];
    
    // If we found a specific recommended URL from compatibility check, prioritize it
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
    
    // Skypack as primary source (always converts to ESM)
    const skypackUrl = `https://cdn.skypack.dev/${libraryName}@${version}`;
    const skypackVerified = await verifyUrl(skypackUrl);
    
    if (skypackVerified) {
        cdnSources.push({
            name: 'skypack',
            url: skypackUrl,
            priority: cdnSources.length > 0 ? 2 : 1,
            verified: true,
            browserCompatible: true
        });
    }
    
    // ESM.sh as alternative (also converts to ESM)
    const esmUrl = `https://esm.sh/${libraryName}@${version}`;
    const esmVerified = await verifyUrl(esmUrl);
    
    if (esmVerified) {
        cdnSources.push({
            name: 'esm.sh',
            url: esmUrl,
            priority: cdnSources.length > 0 ? cdnSources.length + 1 : 1,
            verified: true,
            browserCompatible: true
        });
    }
    
    // Add jsDelivr with specific file path if we found one
    if (compatibilityInfo.compatible && compatibilityInfo.browserFiles && compatibilityInfo.browserFiles.length > 0) {
        const bestFile = compatibilityInfo.browserFiles[0];
        const jsdelivrUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${bestFile}`;
        
        cdnSources.push({
            name: 'jsdelivr',
            url: jsdelivrUrl,
            priority: cdnSources.length > 0 ? cdnSources.length + 1 : 1,
            verified: await verifyUrl(jsdelivrUrl),
            browserCompatible: true,
            filePath: bestFile
        });
    } else {
        // JsDelivr as fallback
        cdnSources.push({
            name: 'jsdelivr',
            url: `https://cdn.jsdelivr.net/npm/${libraryName}@${version}`,
            priority: cdnSources.length > 0 ? cdnSources.length + 1 : 1,
            verified: false,
            browserCompatible: compatibilityInfo.compatible
        });
    }
    
    // Unpkg as last option
    cdnSources.push({
        name: 'unpkg',
        url: `https://unpkg.com/${libraryName}@${version}`,
        priority: cdnSources.length > 0 ? cdnSources.length + 1 : 1,
        verified: false,
        browserCompatible: compatibilityInfo.compatible
    });
    
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
    
    return result;
}

/**
 * Checks if a URL actually exists and is accessible
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} True if the URL exists and is accessible
 */
export async function verifyUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Checks browser compatibility of an npm package
 * @param {string} libraryName - Name of the library
 * @param {string} version - Version of the library
 * @returns {Promise<Object>} Information about browser compatibility
 */
export async function checkBrowserCompatibility(libraryName, version) {
    try {
        // 1. Check package.json for browser fields
        const packageUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}/package.json`;
        const packageResponse = await fetch(packageUrl);
        
        if (!packageResponse.ok) {
            return { compatible: false, reason: "Package not found" };
        }
        
        const packageJson = await packageResponse.json();
        
        // Check for browser-specific fields
        const hasBrowserField = !!packageJson.browser;
        const hasUmdBuild = packageJson.main && (
            packageJson.main.includes('/umd/') || 
            (packageJson.main.includes('/dist/') && packageJson.main.endsWith('.min.js'))
        );
        const isESM = packageJson.type === "module" || !!packageJson.module;
        
        // 2. Check for typical browser distributions
        const files = await listCommonDistributionFiles(libraryName, version);
        const browserFiles = files.filter(file => 
            (file.includes('/dist/') && file.endsWith('.min.js')) ||
            (file.includes('/dist/') && file.endsWith('.js') && !file.includes('/esm/') && !file.includes('/cjs/')) ||
            file.includes('/umd/') ||
            file.includes('/browser/') ||
            file.endsWith('.bundle.js')
        );
        
        const hasBrowserDist = browserFiles.length > 0;
        
        // 3. Check for Node.js-specific dependencies
        const hasNodeDependencies = packageJson.dependencies && Object.keys(packageJson.dependencies).some(
            dep => ['fs', 'path', 'crypto', 'stream', 'http', 'child_process', 'os'].includes(dep)
        );
        
        // Determine compatibility
        const isBrowserCompatible = hasBrowserField || hasUmdBuild || isESM || hasBrowserDist;
        const isPotentiallyIncompatible = hasNodeDependencies && !hasBrowserField && !hasBrowserDist;
        
        // Determine best CDN URL
        let recommendedUrl = null;
        let recommendedPath = null;
        
        if (isBrowserCompatible) {
            if (hasBrowserField && typeof packageJson.browser === 'string') {
                // Use browser field if it's a string
                recommendedPath = packageJson.browser;
                recommendedUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${packageJson.browser}`;
            } else if (hasUmdBuild) {
                // Use UMD build
                recommendedPath = packageJson.main;
                recommendedUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${packageJson.main}`;
            } else if (hasBrowserDist && browserFiles.length > 0) {
                // Sort browser files by priority
                const sortedFiles = [...browserFiles].sort((a, b) => {
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
                
                recommendedPath = sortedFiles[0];
                recommendedUrl = `https://cdn.jsdelivr.net/npm/${libraryName}@${version}${sortedFiles[0]}`;
            } else if (isESM) {
                // For ESM modules we prefer Skypack
                recommendedUrl = `https://cdn.skypack.dev/${libraryName}@${version}`;
            }
        } else if (isPotentiallyIncompatible) {
            // For potentially incompatible libraries, use Skypack as it tries to convert
            recommendedUrl = `https://cdn.skypack.dev/${libraryName}@${version}`;
        }
        
        return {
            compatible: isBrowserCompatible,
            potentiallyIncompatible: isPotentiallyIncompatible,
            esModule: isESM,
            hasBrowserField,
            hasUmdBuild,
            hasBrowserDistribution: hasBrowserDist,
            hasNodeDependencies,
            recommendedUrl,
            recommendedPath,
            browserFiles,
            packageJson: {
                main: packageJson.main,
                browser: packageJson.browser,
                module: packageJson.module,
                type: packageJson.type
            }
        };
    } catch (error) {
        console.error(`Error checking browser compatibility for ${libraryName}@${version}:`, error);
        return { 
            compatible: false, 
            reason: "Error during compatibility check",
            error: error.message 
        };
    }
}

/**
 * Lists typical distribution files of a library
 * @param {string} libraryName - Name of the library
 * @param {string} version - Version of the library
 * @returns {Promise<Array<string>>} List of found files
 */
async function listCommonDistributionFiles(libraryName, version) {
    const commonPaths = [
        '/dist',
        '/umd',
        '/browser',
        '/lib',
        '/build'
    ];
    
    const files = [];
    
    for (const path of commonPaths) {
        try {
            const url = `https://data.jsdelivr.com/v1/package/npm/${libraryName}@${version}/flat${path}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.files) {
                    files.push(...data.files
                        .filter(file => typeof file === 'string' && file.endsWith('.js'))
                        .map(file => `${path}${file}`)
                    );
                }
            }
        } catch (error) {
            // Ignore errors for individual paths
        }
    }
    
    return files;
}

/**
 * Generates SRI (Subresource Integrity) Hash for a URL
 * @param {string} url - URL of the resource
 * @returns {Promise<string|null>} SRI hash in format "sha384-..." or null on error
 */
export async function generateSriHash(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const content = await response.text();

        // We use Web Crypto API for the hash
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-384', data);

        // Convert ArrayBuffer to base64 string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));

        return `sha384-${hashBase64}`;
    } catch (error) {
        console.warn(`Error generating SRI hash for ${url}: ${error.message}`);
        return null;
    }
}

/**
 * Tests if a library can be loaded in the browser
 * @param {string} cdnUrl - CDN URL to test
 * @returns {Promise<Object>} Test results
 */
export async function testBrowserLoading(cdnUrl) {
    // This would need to be implemented in a way that can test loading in the browser
    // One approach is to create a dynamic iframe and attempt to load the script
    try {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(`
                <html>
                <head>
                    <script>
                        window.addEventListener('error', function(e) {
                            window.parent.postMessage({
                                type: 'script-error',
                                error: e.message
                            }, '*');
                        });
                        window.addEventListener('load', function() {
                            window.parent.postMessage({
                                type: 'script-loaded'
                            }, '*');
                        });
                    </script>
                    <script src="${cdnUrl}" onerror="window.parent.postMessage({type: 'script-error', error: 'Failed to load script'}, '*')"></script>
                </head>
                <body></body>
                </html>
            `);
            iframeDoc.close();
            
            // Listen for messages from the iframe
            const messageHandler = (event) => {
                if (event.data.type === 'script-error') {
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                    resolve({
                        success: false,
                        error: event.data.error
                    });
                } else if (event.data.type === 'script-loaded') {
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                    resolve({
                        success: true
                    });
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                document.body.removeChild(iframe);
                resolve({
                    success: false,
                    error: 'Timeout while loading script'
                });
            }, 5000);
        });
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}