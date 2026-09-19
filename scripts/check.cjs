'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root } = require('./build.cjs');
function walk(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(name) : /\.(?:c?js)$/.test(name) ? [name] : [];
  });
}
const files = ['app.js', 'content.js', ...walk('design'), ...walk('scripts'), ...walk('tests')];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
