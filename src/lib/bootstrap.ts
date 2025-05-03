// Import configuration via virtual path defined in tsconfig.json
import bootstrapConfig from '@bootstrap-config';

// Type definitions for our configuration
export type LibrarySource = {
  localPath: string;
  cdnPath: string;
  description?: string;
};

export type BootstrapConfig = {
  libraries: Record<string, LibrarySource>;
  components: Record<string, string>;
  componentGroups: Record<string, string[]>;
  libraryGroups: Record<string, string[]>;
  settings?: Record<string, any>;
};

// Make configuration type-safe
const typedConfig: BootstrapConfig = bootstrapConfig as BootstrapConfig;

// Helper function to get the config (synchronous now)
function getConfig(): BootstrapConfig {
  return typedConfig;
}

// Dynamic loading of libraries with fallback
export async function loadLibrary(name: string): Promise<any> {
  const lib = typedConfig.libraries[name];
  if (!lib) throw new Error(`Library "${name}" not configured`);

  try {
    return await import(/* webpackIgnore: true */ lib.localPath);
  } catch (e) {
    console.warn(`Local library "${name}" failed to load, using CDN fallback`);
    try {
      return await import(/* webpackIgnore: true */ lib.cdnPath);
    } catch (cdnError) {
      console.error(`Failed to load library "${name}" from CDN`);
      throw cdnError;
    }
  }
}

// Resolve groups into individual library names
function resolveLibraries(names: string[]): string[] {
  return names.flatMap(name => {
    // If it's a group, resolve it
    if (name in typedConfig.libraryGroups) {
      return typedConfig.libraryGroups[name];
    }
    // Otherwise it's a direct library name
    return name;
  });
}

// Load multiple libraries
export async function loadLibraries(...names: string[]): Promise<void> {
  // Load all libraries if none specified
  const librariesToLoad = names.length > 0
    ? resolveLibraries(names)
    : Object.keys(typedConfig.libraries);

  // Deduplicate
  const uniqueLibraries = [...new Set(librariesToLoad)];

  await Promise.all(uniqueLibraries.map(async name => {
    try {
      await loadLibrary(name);
      console.log(`Library "${name}" loaded successfully`);
    } catch (e) {
      console.error(`Failed to load library "${name}"`, e);
    }
  }));
}

// Load a component
export async function loadComponent(name: string): Promise<any> {
  const componentPath = typedConfig.components[name];
  if (!componentPath) throw new Error(`Component "${name}" not configured`);

  try {
    return await import(/* webpackIgnore: true */ componentPath);
  } catch (e) {
    console.error(`Failed to load component "${name}"`, e);
    throw e;
  }
}

// Resolve groups into individual component names
function resolveComponents(names: string[]): string[] {
  return names.flatMap(name => {
    // If it's a group, resolve it
    if (name in typedConfig.componentGroups) {
      return typedConfig.componentGroups[name];
    }
    // Otherwise it's a direct component name
    return name;
  });
}

// Load multiple components
export async function loadComponents(...names: string[]): Promise<void> {
  // Load all components if none specified
  const componentsToLoad = names.length > 0
    ? resolveComponents(names)
    : Object.keys(typedConfig.components);

  // Deduplicate
  const uniqueComponents = [...new Set(componentsToLoad)];

  await Promise.all(uniqueComponents.map(async name => {
    try {
      await loadComponent(name);
      console.log(`Component "${name}" loaded successfully`);
    } catch (e) {
      console.error(`Failed to load component "${name}"`, e);
    }
  }));
}

// Application initialization
export async function initializeApp(options: {
  libraries?: string[];
  components?: string[];
  onError?: (error: Error) => void;
} = {}): Promise<void> {
  try {
    // Load libraries
    await loadLibraries(...(options.libraries || []));

    // Load components
    await loadComponents(...(options.components || []));

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application', error);
    if (options.onError && error instanceof Error) {
      options.onError(error);
    }
  }
}

// Export helpers for accessing configuration parts (now synchronous)
export function getBootstrapConfig(): BootstrapConfig {
  return getConfig();
}

export function getLibraries(): Record<string, LibrarySource> {
  return typedConfig.libraries;
}

export function getComponents(): Record<string, string> {
  return typedConfig.components;
}

export function getComponentGroups(): Record<string, string[]> {
  return typedConfig.componentGroups;
}

export function getLibraryGroups(): Record<string, string[]> {
  return typedConfig.libraryGroups;
}

export function getSettings(): Record<string, any> {
  return typedConfig.settings || {};
}