(() => {
'use strict';
const config = window.ABE_RUNTIME_CONFIG || { dataMode: 'fixture' };
const main = document.getElementById('main');
const label = document.getElementById('prototype-label');
const staging = config.environment === 'staging';
let validationTimers = [];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.append(script);
  });
}

function clearValidationTimers() {
  validationTimers.forEach(timer => window.clearTimeout(timer));
  validationTimers = [];
}

function renderValidationStage(activeIndex, progress, status) {
  const state = main?.querySelector('.publication-validation');
  if (!state) return;
  state.querySelectorAll('[data-validation-step]').forEach((row, index) => {
    const active = index === activeIndex;
    row.classList.toggle('is-active', active);
    row.classList.toggle('is-complete', activeIndex >= 3 || index < activeIndex);
    if (active) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
  const progressBar = state.querySelector('[data-validation-progress]');
  if (progressBar) {
    progressBar.style.setProperty('--publication-progress', String(progress / 100));
    progressBar.setAttribute('aria-valuenow', String(progress));
  }
  const progressText = state.querySelector('[data-validation-progress-text]');
  const statusText = state.querySelector('[data-validation-status]');
  if (progressText) progressText.textContent = `${progress}%`;
  if (statusText) statusText.textContent = status;
}

function showLoading() {
  document.body.dataset.publicationState = 'loading';
  if (label) label.textContent = staging ? 'Staging 预览 · 正在校验批准版本… / Staging preview · Verifying approved edition…' : '本机隔离预览 · 正在校验批准版本… / Local isolated preview · Verifying approved edition…';
  if (main) main.innerHTML = `
    <section class="publication-state publication-validation" role="status" aria-live="polite" aria-labelledby="publication-validation-title">
      <div class="publication-validation__meta">
        <p class="publication-validation__kicker">ABE-SPRESSO · DAILY BRIEF</p>
        <p>今日发布校验</p>
      </div>
      <div class="publication-validation__body">
        <h1 id="publication-validation-title">正在准备今日简报</h1>
        <p class="publication-validation__intro" data-validation-subtitle>正在校验当前发布版本与内容完整性。完成后将自动进入今日简报。</p>
        <div class="publication-validation__status-block">
          <div class="publication-validation__progress-head">
            <span data-validation-status>正在确认当前发布版本</span>
            <span data-validation-progress-text>12%</span>
          </div>
          <div class="publication-validation__progress" data-validation-progress role="progressbar" aria-label="今日简报校验进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12"><span></span></div>
          <ol class="publication-validation__steps" aria-label="发布校验步骤">
            <li class="publication-validation__step is-active" data-validation-step="0" aria-current="step">
              <span class="publication-validation__step-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.25 8.25 3 3 6.5-7"/></svg></span>
              <span class="publication-validation__step-label">确认当前发布版本</span>
              <span class="publication-validation__step-meta" lang="en">current pointer</span>
            </li>
            <li class="publication-validation__step" data-validation-step="1">
              <span class="publication-validation__step-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.25 8.25 3 3 6.5-7"/></svg></span>
              <span class="publication-validation__step-label">校验发布清单</span>
              <span class="publication-validation__step-meta" lang="en">generation manifest</span>
            </li>
            <li class="publication-validation__step" data-validation-step="2">
              <span class="publication-validation__step-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.25 8.25 3 3 6.5-7"/></svg></span>
              <span class="publication-validation__step-label">验证内容完整性</span>
              <span class="publication-validation__step-meta" lang="en">article SHA-256</span>
            </li>
          </ol>
        </div>
      </div>
      <div class="publication-validation__footnote">
        <span>仅加载当前已批准版本，不回退历史原型数据。</span>
        <span lang="en"><strong>Maximum signal.</strong> Minimum noise.</span>
      </div>
    </section>`;

  clearValidationTimers();
  validationTimers.push(window.setTimeout(() => renderValidationStage(1, 46, '正在校验发布清单'), 650));
  validationTimers.push(window.setTimeout(() => renderValidationStage(2, 78, '正在验证内容完整性'), 1400));
}

function completeLoading() {
  clearValidationTimers();
  renderValidationStage(3, 100, '校验完成');
  const title = main?.querySelector('#publication-validation-title');
  const subtitle = main?.querySelector('[data-validation-subtitle]');
  if (title) title.textContent = '今日简报已准备完成';
  if (subtitle) subtitle.textContent = '版本与内容完整性校验通过，即将进入今日简报。';
}

function completionPause() {
  const reducedMotion = typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 0 : 520));
}

function showFailure(error) {
  clearValidationTimers();
  document.body.dataset.publicationState = 'error';
  if (label) label.textContent = staging ? 'Staging 预览 · 批准版本加载失败 · 未显示历史原型' : '本机隔离预览 · 批准版本加载失败 · 未显示历史原型';
  if (main) main.innerHTML = `<section class="publication-state publication-state--error" role="alert"><p class="eyebrow">${staging ? 'STAGING READER PREVIEW' : 'LOCAL READER PREVIEW'}</p><h1>批准版本暂不可用</h1><p>完整性或数据校验未通过，因此没有显示任何历史夹具作为“今日新闻”。</p><p class="publication-error-code">${String(error?.code || 'PUBLICATION_LOAD_FAILED').replace(/[&<>"']/g, '')}</p></section>`;
  console.error(error);
}

async function start() {
  if (config.dataMode === 'fixture') {
    await loadScript('content.js');
    await loadScript('app.js');
    return;
  }
  if (config.dataMode !== 'published') throw new Error('Unsupported data mode.');
  showLoading();
  const snapshot = await window.AbePublicationData.loadPublication({
    baseURL: config.publicationBase || './publication/',
    now: config.previewNow ? new Date(config.previewNow) : new Date()
  });
  window.ABE_PUBLICATION_SNAPSHOT = Object.freeze(snapshot);
  window.AFI_STORIES = snapshot.currentEdition.stories;
  window.AFI_TYPES = snapshot.types;
  window.AFI_TOPICS = snapshot.topics;
  completeLoading();
  await completionPause();
  await loadScript('app.js');
  document.body.dataset.publicationState = 'ready';
}

start().catch(showFailure);
})();
