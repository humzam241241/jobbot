/* lightweight build-time sanity checks to avoid common CI failures */
const fs = require('fs');
const path = require('path');

const root = __dirname.replace(/\\scripts$/, '');
const pkgPath = path.join(root, 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const missing = ['pdf-lib', 'docx'].filter((d) => !((pkg.dependencies && pkg.dependencies[d]) || (pkg.devDependencies && pkg.devDependencies[d])));
  if (missing.length) {
    console.log('[prebuild] Missing dependencies:', missing.join(', '));
    process.exit(0); // let ensure:deps install them
  }
  console.log('[prebuild] Dependencies OK');
} catch (e) {
  console.log('[prebuild] skipped:', e.message);
  process.exit(0);
}


