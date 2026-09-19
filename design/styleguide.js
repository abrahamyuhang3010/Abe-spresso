/* Local demonstration only. No network, storage or application state writes. */
(() => {
  const read = document.getElementById('demo-read');
  const save = document.getElementById('demo-save');
  const progress = document.getElementById('demo-progress');
  const progressText = document.getElementById('demo-progress-text');
  const status = document.getElementById('demo-status');
  const dialog = document.getElementById('demo-dialog');
  const trigger = document.getElementById('open-dialog');
  const query = document.getElementById('demo-query');
  const error = document.getElementById('search-error');
  const result = document.getElementById('search-result');
  function setRead(value) {
    read.setAttribute('aria-pressed', String(value));
    read.textContent = value ? '已读 · 撤销' : '标记已读';
    progress.value = Number(value);
    progressText.textContent = `${Number(value)} / 1`;
    progress.textContent = progressText.textContent;
    status.textContent = value ? '已标记这条示例为已读，收藏状态不变。' : '已撤销已读标记。';
  }
  read.addEventListener('click', () => setRead(read.getAttribute('aria-pressed') !== 'true'));
  save.addEventListener('click', () => {
    const value = save.getAttribute('aria-pressed') !== 'true';
    save.setAttribute('aria-pressed', String(value));
    save.textContent = value ? '已收藏 · 取消' : '收藏';
    status.textContent = value ? '已收藏这条示例，已读状态不变。' : '已取消示例收藏。';
  });
  trigger.addEventListener('click', () => { dialog.returnValue = ''; dialog.showModal(); });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') setRead(true);
    trigger.focus();
  });
  document.getElementById('search-example').addEventListener('submit', event => {
    event.preventDefault();
    const term = query.value.trim();
    const invalid = term.length === 0;
    query.setAttribute('aria-invalid', String(invalid));
    error.hidden = !invalid;
    if (invalid) { result.textContent = ''; query.focus(); return; }
    const titles = [...document.querySelectorAll('#editorial h3')];
    const matches = titles.filter(title => title.textContent.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
    result.replaceChildren();
    const summary = document.createElement('p');
    summary.textContent = matches.length ? `找到 ${matches.length} 条标题：` : `没有包含“${term}”的示例标题，请更换关键词。`;
    result.append(summary);
    if (matches.length) {
      const list = document.createElement('ul');
      matches.forEach(title => {
        const item = document.createElement('li');
        item.textContent = title.textContent;
        list.append(item);
      });
      result.append(list);
    }
  });
  query.addEventListener('input', () => {
    query.removeAttribute('aria-invalid');
    error.hidden = true;
    result.replaceChildren();
  });
})();
