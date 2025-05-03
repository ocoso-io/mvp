import fs from "fs";
import {logger} from "./logger.js";

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Path to directory
 */
export function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, {recursive: true});
            logger.info(`Created directory: ${dirPath}`);
        } catch (error) {
            logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
            process.exit(1);
        }
    }
}