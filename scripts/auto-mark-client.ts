import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';

// Initialize ts-morph project
const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'apps', 'web', 'tsconfig.json'),
});

// Add source files
project.addSourceFilesAtPaths('apps/web/components/**/*.tsx');

// Client-side hooks and APIs to detect
const REACT_CLIENT_HOOKS = [
  'useState', 'useEffect', 'useLayoutEffect', 'useRef', 'useReducer',
  'useMemo', 'useCallback', 'useId', 'useTransition', 'useContext',
  'useImperativeHandle', 'useDebugValue', 'useDeferredValue',
  'useInsertionEffect', 'useSyncExternalStore'
];

const CLIENT_LIBRARIES = [
  'react-dropzone', 'react-hot-toast', 'zustand', 'react-use',
  '@tanstack/react-query', 'framer-motion', '@headlessui/react',
  'react-hook-form', 'swr', 'jotai', 'recoil', 'react-dnd'
];

const BROWSER_APIS = [
  'window', 'document', 'localStorage', 'sessionStorage', 'navigator',
  'location', 'history', 'File', 'Blob', 'FormData', 'fetch',
  'XMLHttpRequest', 'WebSocket', 'Worker', 'IntersectionObserver',
  'ResizeObserver', 'MutationObserver', 'requestAnimationFrame',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'addEventListener', 'removeEventListener', 'DataTransfer'
];

// Function to check if a file needs "use client" directive
function needsUseClientDirective(sourceFile: SourceFile): boolean {
  // Skip if file already has "use client" directive
  const text = sourceFile.getFullText();
  if (text.trim().startsWith('"use client"') || text.trim().startsWith("'use client'")) {
    return false;
  }

  // Check for React hooks imports
  const hasReactHooks = sourceFile.getImportDeclarations().some(importDecl => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (moduleSpecifier === 'react') {
      const namedImports = importDecl.getNamedImports();
      return namedImports.some(namedImport => 
        REACT_CLIENT_HOOKS.includes(namedImport.getName())
      );
    }
    return false;
  });

  if (hasReactHooks) return true;

  // Check for client libraries
  const hasClientLibraries = sourceFile.getImportDeclarations().some(importDecl => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    return CLIENT_LIBRARIES.some(lib => moduleSpecifier.startsWith(lib));
  });

  if (hasClientLibraries) return true;

  // Check for next/navigation useRouter
  const hasNextNavigation = sourceFile.getImportDeclarations().some(importDecl => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (moduleSpecifier === 'next/navigation') {
      const namedImports = importDecl.getNamedImports();
      return namedImports.some(namedImport => 
        namedImport.getName() === 'useRouter' || 
        namedImport.getName() === 'useSearchParams' ||
        namedImport.getName() === 'usePathname'
      );
    }
    return false;
  });

  if (hasNextNavigation) return true;

  // Check for browser API usage
  const hasClientAPIs = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).some(identifier => {
    return BROWSER_APIS.includes(identifier.getText());
  });

  if (hasClientAPIs) return true;

  // Check for file input or drag/drop handlers
  const hasFileInputs = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute).some(attr => {
    const name = attr.getName();
    const initializer = attr.getInitializer();
    
    // Check for file input
    if (name === 'type' && initializer?.getText() === '"file"') {
      return true;
    }
    
    // Check for drag/drop handlers
    return ['onDrop', 'onDragOver', 'onDragEnter', 'onDragLeave'].includes(name);
  });

  if (hasFileInputs) return true;

  // Check for useDropzone from react-dropzone
  const hasUseDropzone = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).some(call => {
    const expression = call.getExpression();
    return expression.getText() === 'useDropzone';
  });

  if (hasUseDropzone) return true;

  // Check for useLocalStorage
  const hasUseLocalStorage = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).some(call => {
    const expression = call.getExpression();
    return expression.getText() === 'useLocalStorage';
  });

  if (hasUseLocalStorage) return true;

  return false;
}

// Function to add "use client" directive to a file
function addUseClientDirective(sourceFile: SourceFile): void {
  const fileText = sourceFile.getFullText();
  const newText = '"use client";\n\n' + fileText;
  sourceFile.replaceWithText(newText);
}

// Process all files
let modifiedCount = 0;
const sourceFiles = project.getSourceFiles();
for (const sourceFile of sourceFiles) {
  if (needsUseClientDirective(sourceFile)) {
    console.log(`Adding "use client" directive to ${sourceFile.getFilePath()}`);
    addUseClientDirective(sourceFile);
    modifiedCount++;
  }
}

// Save changes
project.saveSync();

console.log(`\nProcessed ${sourceFiles.length} files.`);
console.log(`Added "use client" directive to ${modifiedCount} files.`);

if (modifiedCount > 0) {
  console.log('\nFiles modified:');
  for (const sourceFile of sourceFiles) {
    if (sourceFile.wasSaved()) {
      console.log(`- ${sourceFile.getFilePath()}`);
    }
  }
}
