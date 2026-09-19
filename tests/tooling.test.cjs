'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, files, guideFiles, root, readAllowedFile } = require('../scripts/build.cjs');
const { createServer, listen, close } = require('../scripts/serve.cjs');

function temporary(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'abespresso-tooling-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function list(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory() ? list(path.join(directory, entry.name), relative + '/') : [relative];
  }).sort();
}

test('manifest contains runtime files, fonts and license, not the development surface', () => {
  assert.equal(new Set(files).size, files.length);
  for (const required of ['index.html', 'app.js', 'content.js', 'styles.css', 'architecture.css', 'assets/brand/icon.svg', 'assets/brand/logo.svg', 'design/tokens.css', 'design/components.css', 'design/fonts/Barlow-OFL.txt']) {
    assert(files.includes(required), required);
  }
  const allowed = /^(?:index\.html|(?:app|content)\.js|(?:styles|architecture)\.css|assets\/(?:brand\/(?:icon|logo)\.svg|(?:robot|servers|chip|code)\.jpg)|design\/(?:tokens|components)\.css|design\/fonts\/Barlow-(?:Regular\.ttf|SemiBold\.ttf|Bold\.ttf|OFL\.txt))$/;
  for (const file of files) assert.match(file, allowed);
  assert(guideFiles.every(file => !files.includes(file)));
});

test('build copies exact bytes and removes stale output on rebuild', t => {
  const directory = temporary(t);
  const output = build(path.join(directory, 'dist'));
  assert.deepEqual(list(output), [...files].sort());
  for (const file of files) assert.deepEqual(fs.readFileSync(path.join(output, file)), fs.readFileSync(path.join(root, file)), file);
  fs.writeFileSync(path.join(output, 'accidental-secret.txt'), 'not for release');
  build(output);
  assert.deepEqual(list(output), [...files].sort());
});

test('built HTML and CSS have no missing local file dependencies', t => {
  const output = build(path.join(temporary(t), 'dist'));
  for (const file of files.filter(file => /\.(?:html|css)$/.test(file))) {
    const text = fs.readFileSync(path.join(output, file), 'utf8');
    const references = [...text.matchAll(/(?:href|src)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)].map(match => match[1] || match[2]);
    for (const reference of references) {
      if (/^(?:#|https?:|data:)/.test(reference)) continue;
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), reference.split(/[?#]/)[0]));
      assert(files.includes(relative), `${file} refers to unpublished ${relative}`);
      assert(fs.existsSync(path.join(output, relative)));
    }
  }
});

test('file reader rejects traversal, dotfiles and symlinked inputs', t => {
  for (const file of ['../README.md', '.env', 'a/../b', 'a\\b', '/etc/passwd', 'a//b']) {
    assert.throws(() => readAllowedFile(root, file), /Unsafe manifest entry/);
  }
  const directory = temporary(t);
  fs.symlinkSync(path.join(root, 'index.html'), path.join(directory, 'alias.html'));
  assert.throws(() => readAllowedFile(directory, 'alias.html'), /non-symlink/);
});

test('build refuses a symlink output without deleting its target', t => {
  const directory = temporary(t);
  const target = path.join(directory, 'keep');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'keep.txt'), 'preserved');
  const link = path.join(directory, 'dist');
  fs.symlinkSync(target, link, 'dir');
  assert.throws(() => build(link), /symlink output/);
  assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'preserved');
});

test('production preview serves all assets and denies repository-only paths', async t => {
  const output = build(path.join(temporary(t), 'dist'));
  // Even a file accidentally placed in dist is not exposed by this QA server.
  fs.writeFileSync(path.join(output, '.env'), 'private');
  const server = createServer(output);
  const url = await listen(server);
  t.after(() => close(server));
  for (const file of files) {
    const response = await fetch(`${url}/${file}`);
    assert.equal(response.status, 200, file);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(output, file)));
  }
  for (const route of ['/', '/#/today', '/#/archive', '/#/saved', '/#/briefs/2026-09-14/items/1']) {
    assert.equal((await fetch(url + route)).status, 200, route);
  }
  for (const route of ['/README.md', '/.git/config', '/.env', '/%2eenv', '/docs/production/ARCHITECTURE.md', '/tests/prototype.test.cjs', '/design/styleguide.html', '/design/news-sources.json', '/Abe-spresso-HTML-Prototype.zip', '/missing.jpg']) {
    assert.equal((await fetch(url + route)).status, 404, route);
  }
  const head = await fetch(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.match(head.headers.get('content-type'), /text\/html/);
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  assert.equal((await fetch(url + '/%ZZ')).status, 400);
});

test('development preview exposes the styleguide but not internal docs', async t => {
  const server = createServer(root, [...files, ...guideFiles]);
  const url = await listen(server);
  t.after(() => close(server));
  for (const file of guideFiles) assert.equal((await fetch(`${url}/${file}`)).status, 200);
  assert.equal((await fetch(`${url}/docs/production/ARCHITECTURE.md`)).status, 404);
});

test('toolchain versions and lockfile agree without runtime npm dependencies', () => {
  const pkg = require('../package.json');
  const lock = require('../package-lock.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, `npm@${pkg.engines.npm}`);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(lock.lockfileVersion, 3);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
  }
});
