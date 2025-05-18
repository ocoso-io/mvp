// scripts/build-packages.js
import { logger } from './utils/logger.js';
import { execSync } from 'child_process'
import path from 'path';
import fs from 'fs';

const packagesDir = path.join(import.meta.dirname, '../packages');
const packages = fs.readdirSync(packagesDir);

// build each package
packages.forEach(pkg => {
    const pkgPath = path.join(packagesDir, pkg);
    logger.info(`Building ${pkg}...`);
    execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
});