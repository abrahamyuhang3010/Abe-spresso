'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const { build, files, guideFiles, root } = require('./build.cjs');
const { createServer, listen, close } = require('./serve.cjs');

async function main() {
  const preview = createServer(build(), files);
  const guide = createServer(root, [...files, ...guideFiles]);
  const started = [];
  let child;
  const stop = () => child?.kill('SIGTERM');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const base = await listen(preview); started.push(preview);
    const guideBase = await listen(guide); started.push(guide);
    console.log(`Testing built site at ${base}; styleguide is QA-only at ${guideBase}.`);
    const status = await new Promise((resolve, reject) => {
      child = spawn(process.execPath, [path.join(root, 'tests/browser-regression.cjs')], {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          PREVIEW_URL: base,
          STYLEGUIDE_URL: `${guideBase}/design/styleguide.html`,
          QA_OUTPUT: process.env.QA_OUTPUT || path.join(root, '.qa/browser'),
        },
      });
      child.once('error', reject);
      child.once('exit', code => resolve(code === null ? 1 : code));
    });
    process.exitCode = status;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await Promise.all(started.map(close));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
