/**
 * This script verifies that all required dependencies for the DOCX pipeline are installed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Required dependencies for the DOCX pipeline
const requiredDeps = [
  'mammoth',
  'docx',
  'jsdom',
  'googleapis',
  'zod',
  'json5'
];

// Required dev dependencies
const requiredDevDeps = [
  '@types/jsdom',
  '@types/mammoth'
];

console.log('Verifying DOCX pipeline dependencies...');

// Check if dependencies are installed in apps/web
const webPackageJsonPath = path.join(__dirname, 'apps', 'web', 'package.json');
if (!fs.existsSync(webPackageJsonPath)) {
  console.error(`Error: ${webPackageJsonPath} not found`);
  process.exit(1);
}

const webPackageJson = require(webPackageJsonPath);
const webDeps = webPackageJson.dependencies || {};
const webDevDeps = webPackageJson.devDependencies || {};

// Check each required dependency
const missingDeps = [];
const missingDevDeps = [];

for (const dep of requiredDeps) {
  if (!webDeps[dep]) {
    missingDeps.push(dep);
  }
}

for (const dep of requiredDevDeps) {
  if (!webDevDeps[dep]) {
    missingDevDeps.push(dep);
  }
}

// Report missing dependencies
if (missingDeps.length > 0 || missingDevDeps.length > 0) {
  console.log('Missing dependencies detected:');
  
  if (missingDeps.length > 0) {
    console.log('Dependencies:', missingDeps.join(', '));
  }
  
  if (missingDevDeps.length > 0) {
    console.log('Dev dependencies:', missingDevDeps.join(', '));
  }
  
  // Install missing dependencies
  console.log('\nInstalling missing dependencies...');
  
  try {
    if (missingDeps.length > 0) {
      const cmd = `cd apps/web && pnpm add ${missingDeps.join(' ')}`;
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    }
    
    if (missingDevDeps.length > 0) {
      const cmd = `cd apps/web && pnpm add -D ${missingDevDeps.join(' ')}`;
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    }
    
    console.log('Dependencies installed successfully!');
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('All required dependencies are installed!');
}

// Create required directories
console.log('\nCreating required directories...');
const directories = [
  path.join(__dirname, 'storage', 'kits'),
  path.join(__dirname, 'apps', 'web', 'lib', 'ai'),
  path.join(__dirname, 'apps', 'web', 'lib', 'extract'),
  path.join(__dirname, 'apps', 'web', 'lib', 'ir'),
  path.join(__dirname, 'apps', 'web', 'lib', 'render'),
  path.join(__dirname, 'apps', 'web', 'lib', 'fs'),
  path.join(__dirname, 'apps', 'web', 'lib', 'pdf', 'fonts'),
  path.join(__dirname, 'apps', 'web', 'server')
];

for (const dir of directories) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

console.log('Directory structure verified!');
console.log('\nDOCX pipeline setup complete!');
