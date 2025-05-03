// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import alias from '@rollup/plugin-alias';

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import dynamic config if it exists
let dynamicConfig = {libraries: [], components: []};
const dynamicConfigPath = path.resolve(process.cwd(), 'build/rollup-dynamic-config.js');

// Check if dynamic config exists
if (fs.existsSync(dynamicConfigPath)) {
    try {
        // Für ES-Module: Wir lesen die Datei und extrahieren die relevanten Daten
        const fileContent = fs.readFileSync(dynamicConfigPath, 'utf8');
        // Einfache JSON-Extraktion aus dem JS-Modul (robustere Methode wäre ein Parser)
        const librariesMatch = fileContent.match(/export const libraryConfigs = (\[.*?\]);/s);
        const componentsMatch = fileContent.match(/export const componentConfigs = (\[.*?\]);/s);

        if (librariesMatch && componentsMatch) {
            const libraries = JSON.parse(librariesMatch[1]);
            const components = JSON.parse(componentsMatch[1]);
            dynamicConfig = {libraries, components};
            console.log(`Loaded dynamic config with ${libraries.length} libraries and ${components.length} components`);
        } else {
            console.warn("Warning: Could not parse dynamic config file content");
        }
    } catch (error) {
        console.warn(`Warning: Could not load dynamic config: ${error.message}`);
    }
}

const production = !process.env.ROLLUP_WATCH;

// Base configuration
const baseConfig = {
    context: 'this',
    external: ['ws', 'ws/wrapper.mjs'],
    plugins: [
        alias({
            entries: [
                {
                    find: '@bootstrap-config',
                    replacement: path.resolve(__dirname, './dist/bootstrap-config.json')
                }
            ]
        }),
        resolve(),
        json(),
        typescript({
            tsconfig: 'tsconfig.json',
            sourceMap: !production
        }),
        production && terser({
            format: {
                comments: false,
            }
        })
    ]
};

// Dev server configuration
const devPlugins = !production ? [
    serve({
        contentBase: ['.', 'demo', 'frontend', 'dist'],
        open: false,
        openPage: 'index.html',
        port: 3000
    }),
    livereload({
        watch: ['dist', 'demo', 'frontend']
    })
] : [];

// Main bundle - with file copying
const mainBundle = {
    ...baseConfig,
    input: 'src/main.ts',
    output: {
        file: 'dist/bundle.js',
        format: 'es',
        sourcemap: !production
    },
    plugins: [
        ...baseConfig.plugins,
        ...devPlugins,
    ]
};

// Fallback mechanism bundle
const bootstrapBundle = {
    ...baseConfig,
    input: 'src/lib/bootstrap.ts',
    output: {
        file: 'dist/bootstrap.js',
        format: 'es',
        sourcemap: false
    }
};

const walletBundle = {
    ...baseConfig,
    input: 'src/wallet.ts',
    external: ['ethers'], // Erkläre ethers als externe Abhängigkeit
    output: {
        file: 'dist/wallet.js',
        format: 'es',
        sourcemap: !production
    }
};


// Create library bundles from dynamic config
const libraryBundles = dynamicConfig.libraries.map(lib => ({
    ...baseConfig,
    input: lib.input,
    output: {
        file: lib.output,
        format: 'es',
        sourcemap: false
    }
}));

// Create component bundles from dynamic config
const componentBundles = dynamicConfig.components.map(comp => ({
    ...baseConfig,
    input: comp.input,
    output: {
        file: comp.output,
        format: 'es',
        sourcemap: !production
    },
    // Libraries are referenced as external dependencies
    external: dynamicConfig.libraries.map(lib => lib.localPath)
}));

// Combine all bundles
export default [
    mainBundle,
    bootstrapBundle,
    walletBundle,
    ...libraryBundles,
    ...componentBundles
];