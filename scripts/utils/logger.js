// Determine if running in a CI environment
const isCI = process.env.CI === 'true';

// Console colors for better readability (disabled in CI environments)
export const colors = {
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

/**
 * Logger utility for consistent console output across build scripts
 */
export const logger = {
    /**
     * Log an informational message
     * @param {string} msg - The message to log
     */
    info: (msg) => console.log(`${colors.blue}INFO:${colors.reset} ${msg}`),
    
    /**
     * Log a success message
     * @param {string} msg - The message to log
     */
    success: (msg) => console.log(`${colors.green}SUCCESS:${colors.reset} ${msg}`),
    
    /**
     * Log a warning message
     * @param {string} msg - The message to log
     */
    warn: (msg) => console.log(`${colors.yellow}WARNING:${colors.reset} ${msg}`),
    
    /**
     * Log an error message
     * @param {string} msg - The message to log
     */
    error: (msg) => console.log(`${colors.red}ERROR:${colors.reset} ${msg}`),
    
    /**
     * Log a section heading
     * @param {string} msg - The heading text
     */
    heading: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    
    /**
     * Print a visual separator line
     */
    separator: () => console.log("----------------------------------------")
};

