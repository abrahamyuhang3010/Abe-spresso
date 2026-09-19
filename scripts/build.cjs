'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const files = require('./site-files.json');
const guideFiles = ['design/styleguide.html', 'design/styleguide.css', 'design/styleguide.js'];

function readAllowedFile(base, file) {
  if (typeof file !== 'string' || !file || file.includes('\\') || file.split('/').some(p => !p || p.startsWith('.')) || path.isAbsolute(file)) {
    throw new Error(`Unsafe manifest entry: ${file}`);
  }
  const full = path.join(base, file);
  if (!fs.lstatSync(full).isFile() || fs.realpathSync(full) !== full) {
    throw new Error(`Not a regular, non-symlink file: ${file}`);
  }
  return fs.readFileSync(full);
}

function build(destination = path.join(root, 'dist')) {
  if (new Set(files).size !== files.length) throw new Error('Duplicate site manifest entry');
  // Validate every input before touching an existing output directory.
  const inputs = files.map(file => [file, readAllowedFile(root, file)]);
  if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink()) {
    throw new Error('Refusing to replace a symlink output directory');
  }
  fs.rmSync(destination, { recursive: true, force: true });
  for (const [file, content] of inputs) {
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return destination;
}

if (require.main === module) {
  build();
  console.log(`Built dist/ from ${files.length} explicitly allowed files. No deployment performed.`);
}
module.exports = { build, files, guideFiles, readAllowedFile, root };
