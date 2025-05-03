import path from "path";
import fs from "fs";
import {logger} from "./logger.js";
import {ensureDirectoryExists} from "./path-utils.js";

/**
 * Load and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {object|null} Parsed JSON object or null if file doesn't exist
 */
export function loadJsonFile(filePath) {
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

/**
 * Write data to a JavaScript module file
 * @param {string} filePath - Target file path
 * @param {string} data - Content to write
 * @returns {boolean} True if successful
 */
export function writeJsModule(filePath, data) {
    try {
        // Ensure directory exists
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

/**
 * Write data to a JSON file
 * @param {string} filePath - Target file path
 * @param {object} data - Data object to stringify and write
 * @returns {boolean} True if successful
 */
export function writeJsonFile(filePath, data) {
    try {
        // Ensure directory exists
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