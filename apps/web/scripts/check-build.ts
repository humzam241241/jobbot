const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

interface BuildCheck {
  name: string;
  check: () => boolean;
  fix?: () => void;
  message: string;
}

const checks: BuildCheck[] = [
  {
    name: 'TypeScript Config',
    check: () => {
      const tsConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'tsconfig.json'), 'utf-8'));
      return !!tsConfig.compilerOptions.paths;
    },
    message: 'Missing path aliases in tsconfig.json'
  },
  {
    name: 'Required Directories',
    check: () => {
      const requiredDirs = [
        'lib/providers',
        'lib/parser',
        'lib/pipeline',
        'public/fonts'
      ];
      return requiredDirs.every(dir => 
        fs.existsSync(path.join(ROOT_DIR, dir))
      );
    },
    fix: () => {
      const dirs = [
        'lib/providers',
        'lib/parser',
        'lib/pipeline',
        'public/fonts'
      ];
      dirs.forEach(dir => {
        const fullPath = path.join(ROOT_DIR, dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      });
    },
    message: 'Missing required directories'
  },
  {
    name: 'Required Files',
    check: () => {
      const requiredFiles = [
        'lib/providers/llm.ts',
        'lib/parser/resume.ts',
        'lib/pipeline/generateContent.ts'
      ];
      return requiredFiles.every(file => 
        fs.existsSync(path.join(ROOT_DIR, file))
      );
    },
    message: 'Missing required source files'
  },
  {
    name: 'Dependencies',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
      const requiredDeps = [
        'pdf-lib',
        'fontkit',
        'pdfjs-dist',
        'hypher',
        'hyphenation.en-us',
        'react-hot-toast',
        'react-icons',
        'sharp'
      ];
      return requiredDeps.every(dep => 
        pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
      );
    },
    message: 'Missing required dependencies'
  }
];

async function runChecks() {
  console.log('Running pre-build checks...\n');
  
  let hasErrors = false;
  
  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    
    try {
      const passed = check.check();
      
      if (passed) {
        console.log('✅');
      } else {
        console.log('❌');
        console.log(`  Error: ${check.message}`);
        
        if (check.fix) {
          process.stdout.write('  Attempting to fix... ');
          try {
            check.fix();
            console.log('✅');
          } catch (err) {
            const error = err as Error;
            console.log('❌');
            console.log(`  Fix failed: ${error?.message || 'Unknown error'}`);
            hasErrors = true;
          }
        } else {
          hasErrors = true;
        }
      }
    } catch (err) {
      const error = err as Error;
      console.log('❌');
      console.log(`  Error: ${error?.message || 'Unknown error'}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\n❌ Pre-build checks failed. Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All pre-build checks passed!');
  }
}

runChecks().catch(err => {
  const error = err as Error;
  console.error('Error running checks:', error?.message || 'Unknown error');
  process.exit(1);
});