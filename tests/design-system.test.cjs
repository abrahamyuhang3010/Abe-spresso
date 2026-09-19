/* Dependency-free contract checks; does not replace browser/accessibility QA. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const tokens = read('design/tokens.css');
const components = read('design/components.css');
const guide = read('design/styleguide.html');
const checks = [];
function test(name, fn) { fn(); checks.push(name); }
const defs = new Map([...tokens.matchAll(/(--ab-[\w-]+)\s*:\s*([^;{}]+);/g)].map(m => [m[1], m[2].trim()]));
function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function ratio(a, b) { const x = luminance(defs.get(`--ab-color-${a}`)); const y = luminance(defs.get(`--ab-color-${b}`)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const contrasts = [];
test('Every ab token reference resolves', () => {
  for (const file of ['design/tokens.css', 'design/components.css', 'design/styleguide.css', 'styles.css', 'architecture.css']) {
    for (const [, token] of read(file).matchAll(/var\((--ab-[\w-]+)/g)) assert(defs.has(token), `${file}: ${token}`);
  }
});
test('English-first sans stack, no serif UI families remain', () => {
  assert(defs.get('--ab-font-sans').startsWith('"Barlow", "Noto Sans SC"'));
  for (const f of ['styles.css', 'architecture.css', 'design/tokens.css', 'design/components.css']) assert(!/Georgia|Songti|STSong|Noto Serif|var\(--serif\)/i.test(read(f)), f);
});
test('Type roles and tap target are explicit', () => {
  assert.equal(defs.get('--ab-text-body'), '1rem');
  assert.equal(defs.get('--ab-text-reading'), '1.125rem');
  assert.equal(defs.get('--ab-text-meta'), '.875rem');
  assert.equal(defs.get('--ab-target-min'), '2.75rem');
});
test('New components avoid tiny text, hardcoded colors and important patches', () => {
  for (const f of ['design/components.css', 'design/styleguide.css']) {
    const s = read(f); assert(!/!important/.test(s)); assert(!/#[\da-f]{3,8}\b/i.test(s)); assert(!/font-size\s*:\s*\d+px/.test(s));
  }
});
test('Documented text contrast pairs meet 4.5:1', () => {
  const pairs = [['ink','paper'],['muted','paper'],['muted','surface'],['accent','paper'],['on-accent','accent'],['on-accent','accent-hover'],['accent','accent-soft'],['success','success-soft'],['warning','warning-soft'],['danger','danger-soft']];
  for (const [a,b] of pairs) { const r = ratio(a,b); assert(r >= 4.5, `${a}/${b} = ${r}`); contrasts.push({pair: `${a}/${b}`, ratio: +r.toFixed(2)}); }
});
test('Control borders and focus meet 3:1 against paper', () => {
  for (const a of ['control-border','focus']) { const r = ratio(a,'paper'); assert(r >= 3); contrasts.push({pair: `${a}/paper`, ratio: +r.toFixed(2)}); }
});
test('Guide has one h1 and unique IDs, local links resolve', () => {
  assert.equal((guide.match(/<h1\b/g) || []).length, 1);
  const ids = [...guide.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]); assert.equal(ids.length, new Set(ids).size);
  for (const [,url] of guide.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (url.startsWith('#')) assert(ids.includes(url.slice(1)), url);
    else if (!/^(https?:|data:)/.test(url)) assert(fs.existsSync(path.resolve(root, 'design', url)), url);
  }
});
test('Local Barlow faces are valid SFNT files and licensed', () => {
  for (const weight of ['Regular','SemiBold','Bold']) {
    const file = fs.readFileSync(path.join(root, `design/fonts/Barlow-${weight}.ttf`));
    assert(file.length > 10000, `${weight}: truncated font`);
    assert.equal(file.readUInt32BE(0), 0x00010000, `${weight}: invalid sfnt`);
    const count = file.readUInt16BE(4);
    for (let i=0;i<count;i++) { const pos=12+i*16; const offset=file.readUInt32BE(pos+8); const length=file.readUInt32BE(pos+12); assert(offset+length<=file.length, `${weight}: truncated table`); }
  }
  assert(read('design/fonts/Barlow-OFL.txt').includes('SIL OPEN FONT LICENSE'));
  assert.equal((tokens.match(/font-display: swap/g)||[]).length, 3);
});
test('Native dialog, toggle states, live status and reduced motion', () => {
  assert(guide.includes('<dialog')); assert(guide.includes('aria-labelledby="dialog-title"'));
  assert(guide.includes('aria-pressed="false"')); assert(guide.includes('role="status"'));
  assert(components.includes(':focus-visible')); assert(components.includes('prefers-reduced-motion'));
  assert(!/localStorage|sessionStorage|fetch\(/.test(read('design/styleguide.js')));
});
test('Legacy entrypoint loads token definitions before styles', () => {
  const index = read('index.html'); assert(index.indexOf('design/tokens.css') < index.indexOf('href="styles.css"'));
});
test('Source brand colors match supplied SVG artwork', () => {
  const logo = read('assets/brand/logo.svg'), icon = read('assets/brand/icon.svg');
  for (const token of ['brand','brand-deep','steam']) assert(logo.toLowerCase().includes(defs.get(`--ab-color-${token}`)));
  assert(icon.toLowerCase().includes(defs.get('--ab-color-brand')));
  assert.equal(defs.get('--ab-color-accent'), defs.get('--ab-color-brand-deep'));
});
test('Brand SVGs are unchanged, self-contained assets', () => {
  const crypto = require('node:crypto');
  const refs = read('design/REFERENCES.md');
  for (const name of ['logo','icon']) {
    const svg = read(`assets/brand/${name}.svg`);
    assert(!/<(?:script|foreignObject)|\bon\w+=|\b(?:href|xlink:href)=/i.test(svg));
    assert(svg.includes('viewBox="0 0 228 228"'));
    assert(refs.includes(crypto.createHash('sha256').update(svg).digest('hex')));
  }
});
test('Favicon and in-page logo roles remain separate in both entrypoints', () => {
  for (const file of ['index.html','design/styleguide.html']) {
    const html = read(file);
    assert(/<link[^>]+rel="icon"[^>]+href="(?:\.\.\/)?assets\/brand\/icon.svg"/.test(html), file);
    assert(/<meta name="theme-color" content="#f50057">/.test(html), file);
    for (const tag of ['header','footer']) {
      const area = html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`))[0];
      assert(area.includes('assets/brand/logo.svg'), `${file}: ${tag}`);
      assert(!area.includes('assets/brand/icon.svg'), `${file}: ${tag}`);
    }
  }
});
test('Vivid pink is a nontext accent, never the primary white-label fill', () => {
  assert(ratio('on-accent','brand') < 4.5);
  assert(ratio('brand','surface') >= 3);
  assert(ratio('steam','paper') < 3);
  const primary = components.match(/\.ab-button--primary\s*\{[^}]+\}/)[0];
  assert(primary.includes('var(--ab-color-accent)'));
  assert(!primary.includes('var(--ab-color-brand)'));
});
test('Additional action, neutral and focus pairings are accessible', () => {
  for (const [a,b,min] of [['ink','surface',4.5],['accent','surface',4.5],['accent-hover','paper',4.5],['control-border','surface',3],['focus','surface',3],['brand','surface',3]]) {
    const r = ratio(a,b); assert(r >= min, `${a}/${b} = ${r}`);
    contrasts.push({pair: `${a}/${b}`, ratio: +r.toFixed(2)});
  }
});
test('Active product styles contain no ad hoc hex colors or legacy red palette', () => {
  for (const file of ['styles.css','architecture.css']) assert(!/#[\da-f]{3,8}\b/i.test(read(file)), file);
  for (const file of ['design/tokens.css','design/styleguide.html']) assert(!/#(?:bd2926|98201e|f9eeec)\b/i.test(read(file)), file);
});
test('CSS comments cannot swallow following layout and focus rules', () => {
  for (const file of ['styles.css','architecture.css','design/tokens.css','design/components.css','design/styleguide.css']) {
    const css = read(file); let open = false;
    for (const match of css.matchAll(/\/\*|\*\//g)) {
      if (match[0] === '/*') { assert(!open, `${file}: nested/unclosed comment`); open = true; }
      else { assert(open, `${file}: unmatched comment end`); open = false; }
    }
    assert(!open, `${file}: unclosed comment`);
  }
});
test('Product CSS owns component rules without important or legacy typography', () => {
  for (const file of ['styles.css','architecture.css']) {
    const css = read(file);
    assert(!/!important/.test(css), file);
    assert(!/font-size\s*:\s*[\d.]+px/.test(css), `${file}: fixed px typography`);
    assert(!/@media[^{}]*(?:570|850|1100)px/.test(css), `${file}: legacy breakpoint`);
    for (const [,value] of css.matchAll(/font-size\s*:\s*([^;{}]+)/g)) assert(value.trim().startsWith('var(--ab-text-'), `${file}: untracked type size`);
  }
});
test('Product shares primitives before component-specific styles', () => {
  const html=read('index.html');
  const files=['design/tokens.css','design/components.css','styles.css','architecture.css'];
  const positions=files.map(file=>html.indexOf(`href="${file}"`));
  assert(positions.every((pos,i)=>pos>=0&&(!i||pos>positions[i-1])));
  assert(/<body[^>]*class="ab-root"/.test(html));
});
test('Reading sizes and focus values remain canonical', () => {
  for (const [token,value] of [['--ab-text-body','1rem'],['--ab-text-reading','1.125rem'],['--ab-text-meta','.875rem'],['--ab-focus-offset','3px']]) assert.equal(defs.get(token),value,token);
  assert(components.includes('aspect-ratio: 16/9'));
  assert(!/\.ab-tag\s*\{[^}]*var\(--ab-text-caption\)/.test(components));
});
test('News cards do not retain dedicated value-explanation markup or data', () => {
  assert(!/scanWhy|scanValues/.test(read('content.js')));
  assert(!/why-box|scanWhy/.test(read('app.js')));
  assert(!/why-box/.test(read('architecture.css')));
  assert(!/ab-insight/.test(guide + components));
});
console.log(JSON.stringify({passed: checks.length, checks, contrasts}, null, 2));
