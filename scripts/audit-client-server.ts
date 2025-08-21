import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile } from 'ts-morph';

// Initialize ts-morph project
const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'apps', 'web', 'tsconfig.json'),
});

// Add source files
project.addSourceFilesAtPaths('apps/web/components/**/*.tsx');

// Server-only modules that should not be imported in client components
const SERVER_MODULES = [
  'fs', 'node:fs', 'path', 'node:path', 'url', 'node:url',
  'crypto', 'node:crypto', 'os', 'node:os', 'child_process', 'stream', 
  'node:stream', 'puppeteer', 'pdf-parse', 'mammoth', 'prisma',
  '@prisma/client'
];

// Function to check if a file has "use client" directive
function hasUseClientDirective(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  return text.trim().startsWith('"use client"') || text.trim().startsWith("'use client'");
}

// Function to check if a file imports server-only modules
function hasServerModuleImports(sourceFile: SourceFile): string[] {
  const serverImports: string[] = [];
  
  sourceFile.getImportDeclarations().forEach(importDecl => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    
    // Check for direct server module imports
    if (SERVER_MODULES.some(module => moduleSpecifier === module || moduleSpecifier.startsWith(module + '/'))) {
      serverImports.push(moduleSpecifier);
    }
    
    // Check for pipeline imports
    if (moduleSpecifier.includes('/lib/pipeline/')) {
      serverImports.push(moduleSpecifier);
    }
  });
  
  return serverImports;
}

// Process all files
let hasErrors = false;
const sourceFiles = project.getSourceFiles();

console.log('Auditing client components for server module imports...');

for (const sourceFile of sourceFiles) {
  if (hasUseClientDirective(sourceFile)) {
    const serverImports = hasServerModuleImports(sourceFile);
    
    if (serverImports.length > 0) {
      console.error(`\n❌ ERROR: Client component ${sourceFile.getFilePath()} imports server-only modules:`);
      serverImports.forEach(imp => {
        console.error(`  - ${imp}`);
      });
      console.error('  These imports should be moved to API routes instead.');
      hasErrors = true;
    }
  }
}

if (!hasErrors) {
  console.log('\n✅ All client components are free of server-only module imports.');
} else {
  console.error('\n❌ Found client components with server-only module imports.');
  console.error('Please fix these issues by moving server-side code to API routes.');
  process.exit(1);
}