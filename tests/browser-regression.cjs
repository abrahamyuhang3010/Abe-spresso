/* Run against the local preview. Requires Playwright and installed Chrome.
   PREVIEW_URL, STYLEGUIDE_URL, BROWSER_CHANNEL, and QA_OUTPUT can be set without changing fixtures. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const guideURL = process.env.STYLEGUIDE_URL || base + '/design/styleguide.html';
const out = process.env.QA_OUTPUT || path.resolve(__dirname, '../.qa/browser');
fs.mkdirSync(out, { recursive: true });
const key = 'afi-editorial-prototype-v1';
const results = [];
const errors = [];
const guideResults = [];
async function inspect(page, label) {
  const audit = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const controls = [...document.querySelectorAll('button,select,input,summary,a:not([aria-hidden="true"])')].filter(visible);
    const undersized = controls.filter(e => { const r=e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }).map(e => ({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,45),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
    const tiny = [...document.querySelectorAll('body *')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize)<14).map(e=>({cls:e.className,text:e.textContent.slice(0,50),size:getComputedStyle(e).fontSize}));
    const headings = [...document.querySelectorAll('#main h1,#main h2,#main h3,#main h4')].map(e=>Number(e.tagName[1]));
    const bodies = [...document.querySelectorAll('.ab-source-quote,.source-placeholder,.detail-section > p,.article-body > p,.article-body li,.article-body td,.article-body th')];
    const smallBody = bodies.filter(e=>parseFloat(getComputedStyle(e).fontSize) < (!!e.closest('.detail-section')?18:16)).length;
    const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,undersized,tiny,smallBody,h1:document.querySelectorAll('#main h1').length,headingSkip:headings.some((n,i)=>i&&n>headings[i-1]+1),uniqueIds:new Set(ids).size===ids.length,articles:document.querySelectorAll('[data-story]').length};
  });
  results.push({label,...audit});
  assert(audit.scroll<=audit.width,`${label}: horizontal overflow ${JSON.stringify(audit)}`);
  assert.equal(audit.h1,1,`${label}: h1`);
  assert(!audit.headingSkip,`${label}: heading hierarchy`);
  assert(audit.uniqueIds,`${label}: duplicate IDs`);
  assert.equal(audit.tiny.length,0,`${label}: text <14px ${JSON.stringify(audit.tiny)}`);
  assert.equal(audit.smallBody,0,`${label}: undersized body`);
  assert.equal(audit.undersized.length,0,`${label}: undersized targets ${JSON.stringify(audit.undersized)}`);
}
async function ready(page,url) { await page.goto(url); await page.evaluate(()=>document.fonts.ready); }
async function screenshot(page,name) {
  // Scroll through to load local lazy images, then capture without a misleading blank thumbnail.
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}scrollTo(0,0);});
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try {
  for(const lang of ['zh','en']) {
   const context=await browser.newContext();
   await context.addInitScript(({key,lang})=>localStorage.setItem(key,JSON.stringify({lang,demo:true,saved:[4],read:[]})),{key,lang});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   for(const width of [320,375,768,1024,1440]) {
    await p.setViewportSize({width,height:1000});
    for(const [name,route] of [['today','today'],['detail','briefs/2026-09-14/items/1'],['archive','archive'],['saved','saved']]) {
     await ready(p,base+'/#/'+route);await inspect(p,`${lang}-${width}-${name}`);
     if(name==='today') {
      assert.equal(await p.locator('[data-story]').count(),12);
      assert.equal(await p.locator('.why-box').count(),0);
      assert(!/为什么重要|WHY IT MATTERS/i.test(await p.locator('#main').innerText()));
      assert.equal(await p.locator('[data-story] .ab-source-quote').count(),12);
     }
     await screenshot(p,`${lang}-${width}-${name}`);
    }
   }
   await context.close();
  }
  const c=await browser.newContext({viewport:{width:375,height:900}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await ready(p,base+'/#/today');
  await p.keyboard.press('Tab');assert(await p.locator('.skip-link').evaluate(e=>e===document.activeElement));
  assert.equal(await p.locator('.skip-link').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  await p.keyboard.press('Enter');assert(await p.locator('#main').evaluate(e=>e===document.activeElement));
  await p.locator('[data-action="search"]').click();await p.locator('#search-input').fill('no-results-888');assert.equal(await p.locator('.search-result').count(),0);
  await screenshot(p,'search-empty-375');
  // Native Chrome search inputs consume the first Escape to clear a nonempty query.
  await p.keyboard.press('Escape');assert.equal(await p.locator('#search-input').inputValue(),'');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#dialog').open);assert(await p.locator('[data-action="search"]').evaluate(e=>e===document.activeElement));
  await p.locator('[data-save="4"]').click();await p.locator('[data-action="enter-demo"]').click();await p.waitForFunction(()=>document.activeElement.dataset.save==='4');
  let stored=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.deepEqual(stored.saved,[4]);assert.deepEqual(stored.read,[]);
  await p.locator('[data-read="1"]').click();stored=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.deepEqual(stored.saved,[4]);assert.deepEqual(stored.read,[1]);
  await p.locator('[data-nav="saved"]').click();await p.locator('[data-save="4"]').click();assert(await p.locator('#main').evaluate(e=>e===document.activeElement));await screenshot(p,'saved-empty-375');
  await p.locator('[data-nav="today"]').click();await p.locator('.filter-disclosure summary').click();await p.locator('#content-type').selectOption('concepts');await p.locator('#technical-topic').selectOption('agents');await inspect(p,'filter-empty-375');await screenshot(p,'filter-empty-375');
  await p.locator('.filter-controls [data-action="reset-filters"]').click();assert.equal(await p.locator('[data-story]').count(),12);
  const beforeSourceClicks=await p.evaluate(key=>localStorage.getItem(key),key);
  await c.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.fulfill({status:200,contentType:'text/html',body:'<title>Source navigation test</title>'}));
  const sourceURLs=await p.evaluate(()=>window.AFI_STORIES.map(s=>s.originalArticle.url));
  for(let i=0;i<12;i++) {
   const popupPromise=c.waitForEvent('page');
   await p.locator(`[data-story="${i+1}"] .story-source a`).click();
   const popup=await popupPromise;await popup.waitForLoadState();
   assert.equal(popup.url(),sourceURLs[i]);assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
  }
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),beforeSourceClicks);
  await p.locator('[data-action="complete"]').click();await p.locator('[data-action="confirm-complete"]').click();await p.waitForFunction(()=>document.activeElement.id==='main');assert((await p.locator('.progress-info').textContent()).includes('12 / 12'));
  await p.reload();assert((await p.locator('.progress-info').textContent()).includes('12 / 12'));
  await p.locator('[data-action="video"]').click();assert.equal(await p.locator('iframe').count(),0);await screenshot(p,'video-consent-375');await p.keyboard.press('Escape');
  // Large text test, not a claim of browser-level zoom certification.
  await p.addStyleTag({content:'html { font-size: 200%; }'});await inspect(p,'200-percent-text-375');await screenshot(p,'200-percent-text-375');
  await c.close();
  // Long headlines/resource names, failed photos, reduced-motion and missing fonts.
  const stress=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'});
  await stress.route('**/fonts/**',route=>route.abort());await stress.route('**/assets/*.jpg',route=>route.abort());
  const q=await stress.newPage();await ready(q,base+'/#/today');
  await q.evaluate(()=>{document.querySelector('.story-title a').textContent='超长标题与LongUnbrokenModelIdentifier'.repeat(8);document.querySelector('.story-source').textContent='LongUnbrokenResourceName'.repeat(15)});
  await inspect(q,'320-long-text-image-font-failure');await screenshot(q,'320-long-text-image-font-failure');
  await stress.close();
  // Full-text reader uses only an original QA document, injected in an isolated browser context.
  // No production news article is replaced or presented as a licensed reproduction.
  const makeArticle=require('./fixtures/article-content.cjs');
  const fixture=makeArticle('https://example.com/reader-fixture');
  const fixtureSource=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8')+`\nObject.assign(window.AFI_STORIES[0], {source:'QA fixture',sourceEn:'QA fixture',articleContent:${JSON.stringify(fixture)}});Object.assign(window.AFI_STORIES[0].originalArticle,{title:'Source document reader — original QA fixture',publisher:'QA fixture',url:'https://example.com/reader-fixture'});`;
  for(const lang of ['zh','en']) {
   const reader=await browser.newContext();
   await reader.addInitScript(({key,lang})=>localStorage.setItem(key,JSON.stringify({lang,demo:true,saved:[],read:[]})),{key,lang});
   await reader.route('**/content.js',r=>r.fulfill({contentType:'application/javascript',body:fixtureSource}));
   await reader.route('**/assets/articles/reader-fixture.png',r=>r.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(__dirname,'fixtures/reader-diagram.png'))}));
   const rp=await reader.newPage();rp.on('pageerror',e=>errors.push(e.message));
   for(const width of [320,375,768,1024,1440]) {
    await rp.setViewportSize({width,height:1000});await ready(rp,base+'/#/briefs/2026-09-14/items/1');
    assert.equal(await rp.locator('.article-body > *').count(),fixture.blocks.length);
    await rp.locator('.article-contents summary').click();
    await inspect(rp,`${lang}-${width}-full-reader`);
    await screenshot(rp,`${lang}-${width}-full-reader`);
    const image=await rp.locator('[data-article-image]').evaluate(e=>({w:e.width,h:e.height,natural:e.naturalWidth,fit:getComputedStyle(e).objectFit}));
    assert.equal(image.natural,1200);assert(Math.abs(image.w/image.h-1200/540)<.03);assert.equal(image.fit,'contain');
    assert.equal(await rp.locator('.article-image-fallback').isVisible(),false);
   }
   await rp.locator('.article-jump').nth(1).focus();await rp.keyboard.press('Enter');
   assert(rp.url().endsWith('#/briefs/2026-09-14/items/1'));
   assert.equal(await rp.evaluate(()=>document.activeElement.id),'article-section-7');
   assert.equal(await rp.locator('#article-section-7').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
   await rp.locator('[data-save="1"]').click();
   assert.deepEqual(await rp.evaluate(key=>JSON.parse(localStorage.getItem(key)).read,key),[]);
   await rp.locator('[data-read="1"]').click();
   assert.deepEqual(await rp.evaluate(key=>JSON.parse(localStorage.getItem(key)).saved,key),[1]);
   await rp.setViewportSize({width:375,height:1000});await rp.addStyleTag({content:'html { font-size: 200%; }'});
   await inspect(rp,`${lang}-375-full-reader-200-percent-text`);
   await reader.unroute('**/assets/articles/reader-fixture.png');await reader.route('**/assets/articles/reader-fixture.png',r=>r.abort());
   await rp.reload();await rp.locator('.article-figure').scrollIntoViewIfNeeded();
   await rp.waitForFunction(()=>document.querySelector('[data-article-image]').hidden);
   assert(await rp.locator('.article-image-fallback').isVisible());assert(await rp.locator('figcaption').isVisible());
   await inspect(rp,`${lang}-375-full-reader-failed-image`);await screenshot(rp,`${lang}-375-full-reader-failed-image`);
   await reader.close();
  }

  const guideContext=await browser.newContext();const g=await guideContext.newPage();g.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,375,768,1024,1440]) {
   await g.setViewportSize({width,height:1000});await ready(g,guideURL);
   const sizes=await g.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert(sizes.scroll<=sizes.width,`styleguide ${width}: horizontal overflow`);guideResults.push(sizes);
   await screenshot(g,`styleguide-${width}`);
  }
  await g.locator('#open-dialog').click();assert(await g.locator('#demo-dialog').evaluate(e=>e.open));await g.keyboard.press('Escape');await g.waitForFunction(()=>document.activeElement.id==='open-dialog');
  await guideContext.close();
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:results.length,results,guideResults,errors,interactionChecks:'12 actual source-link popup destinations (network intercepted), keyboard, dialog focus, save/read independence, removal focus, filters, complete/reload, video consent'},null,2));
  fs.rmSync(path.join(out,'failure.json'),{force:true});
  console.log(JSON.stringify({passed:results.length,guideViewports:guideResults.length,errors,out},null,2));
 } finally {await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({message:e.message,results,errors},null,2));console.error(e);process.exit(1);});
