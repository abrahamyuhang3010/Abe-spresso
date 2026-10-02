'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../publication-bootstrap.js'), 'utf8');

function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await tick();
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function start({ config, loadPublication, scriptFailure } = {}) {
  const dom = new JSDOM(`<!doctype html><body><div id="prototype-label"></div><main id="main"></main></body>`, {
    url: 'http://preview.test/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  const appended = [];
  const completed = [];
  const timeline = [];
  const originalAppend = window.document.body.append.bind(window.document.body);
  window.ABE_RUNTIME_CONFIG = config;
  if (loadPublication) window.AbePublicationData = { loadPublication };
  window.console.error = () => {};
  window.document.body.append = (...nodes) => {
    originalAppend(...nodes);
    for (const node of nodes) {
      if (node.tagName !== 'SCRIPT') continue;
      const src = node.getAttribute('src');
      appended.push(src);
      timeline.push(`append:${src}`);
      queueMicrotask(() => {
        if (scriptFailure === src) node.onerror?.(new window.Event('error'));
        else {
          completed.push(src);
          timeline.push(`complete:${src}`);
          node.onload?.(new window.Event('load'));
        }
      });
    }
  };
  window.eval(source);
  return { dom, window, document: window.document, appended, completed, timeline };
}

function snapshot() {
  return {
    mode: 'published',
    status: 'ready',
    currentEdition: { id: '2026-09-25-daily', stories: [{ id: 'story-1' }] },
    types: { news: ['新闻', 'News'] },
    topics: { agents: ['智能体', 'Agents'] },
    editions: [],
  };
}

test('fixture mode loads content.js before app.js and keeps the explicit legacy path', async t => {
  const state = start({ config: { dataMode: 'fixture' } });
  t.after(() => state.dom.window.close());
  await waitFor(() => state.appended.length === 2, 'fixture scripts');
  assert.deepEqual(state.appended, ['content.js', 'app.js']);
  await waitFor(() => state.completed.length === 2, 'fixture app');
  assert.deepEqual(state.completed, ['content.js', 'app.js']);
  assert.deepEqual(state.timeline, [
    'append:content.js',
    'complete:content.js',
    'append:app.js',
    'complete:app.js',
  ]);
  assert.equal(state.document.body.dataset.publicationState, undefined);
});

test('published mode verifies data, exposes reader dictionaries and only then loads app.js', async t => {
  const approved = snapshot();
  let received;
  const state = start({
    config: { dataMode: 'published', publicationBase: './publication/', previewNow: '2026-09-25T04:00:00.000Z' },
    loadPublication: async options => { received = options; return approved; },
  });
  t.after(() => state.dom.window.close());
  assert.equal(state.document.body.dataset.publicationState, 'loading');
  assert.equal(state.document.querySelector('.publication-validation h1').textContent, '正在准备今日简报');
  assert.deepEqual([...state.document.querySelectorAll('.publication-validation__step-label')].map(node => node.textContent), [
    '确认当前发布版本',
    '校验发布清单',
    '验证内容完整性',
  ]);
  assert.deepEqual([...state.document.querySelectorAll('.publication-validation__step-meta')].map(node => node.textContent), [
    'current pointer',
    'generation manifest',
    'article SHA-256',
  ]);
  assert.equal(state.document.querySelector('[data-validation-progress]').getAttribute('aria-valuenow'), '12');
  await waitFor(() => state.document.body.dataset.publicationState === 'ready', 'published reader');
  assert.deepEqual(state.appended, ['app.js']);
  assert.equal(state.window.ABE_PUBLICATION_SNAPSHOT, approved);
  assert.equal(Object.isFrozen(state.window.ABE_PUBLICATION_SNAPSHOT), true);
  assert.equal(state.window.AFI_STORIES, approved.currentEdition.stories);
  assert.equal(state.window.AFI_TYPES, approved.types);
  assert.equal(state.window.AFI_TOPICS, approved.topics);
  assert.equal(received.baseURL, './publication/');
  assert.equal(received.now.toISOString(), '2026-09-25T04:00:00.000Z');
  assert(state.document.querySelector('#prototype-label').textContent.includes('本机隔离预览'));
});

test('published load failure fails closed without loading app.js or historical content.js', async t => {
  const error = Object.assign(new Error('tampered generation'), { code: 'FILE_INTEGRITY_FAILED' });
  const state = start({
    config: { dataMode: 'published' },
    loadPublication: async () => { throw error; },
  });
  t.after(() => state.dom.window.close());
  await waitFor(() => state.document.body.dataset.publicationState === 'error', 'failure state');
  assert.deepEqual(state.appended, []);
  assert.equal(state.window.AFI_STORIES, undefined);
  assert.equal(state.document.querySelectorAll('[data-story]').length, 0);
  assert(state.document.querySelector('#main').textContent.includes('没有显示任何历史夹具'));
  assert.equal(state.document.querySelector('.publication-error-code').textContent, 'FILE_INTEGRITY_FAILED');
});

test('unsupported data mode fails closed instead of guessing a source', async t => {
  const state = start({ config: { dataMode: 'automatic' } });
  t.after(() => state.dom.window.close());
  await waitFor(() => state.document.body.dataset.publicationState === 'error', 'unsupported mode failure');
  assert.deepEqual(state.appended, []);
  assert.equal(state.document.querySelector('.publication-error-code').textContent, 'PUBLICATION_LOAD_FAILED');
  assert.equal(state.document.querySelectorAll('[data-story]').length, 0);
});

test('failure codes are rendered as inert text and cannot inject markup', async t => {
  const error = Object.assign(new Error('unsafe'), { code: '<img src=x onerror="window.injected=true">' });
  const state = start({
    config: { dataMode: 'published' },
    loadPublication: async () => { throw error; },
  });
  t.after(() => state.dom.window.close());
  await waitFor(() => state.document.body.dataset.publicationState === 'error', 'sanitized failure');
  assert.equal(state.document.querySelector('.publication-error-code img'), null);
  assert.equal(state.window.injected, undefined);
  assert(!state.document.querySelector('.publication-error-code').textContent.includes('<'));
});

test('app script load failure does not fall back to content.js', async t => {
  const state = start({
    config: { dataMode: 'published' },
    loadPublication: async () => snapshot(),
    scriptFailure: 'app.js',
  });
  t.after(() => state.dom.window.close());
  await waitFor(() => state.document.body.dataset.publicationState === 'error', 'app load failure');
  assert.deepEqual(state.appended, ['app.js']);
  assert.equal(state.appended.includes('content.js'), false);
  assert.equal(state.document.querySelectorAll('[data-story]').length, 0);
});
