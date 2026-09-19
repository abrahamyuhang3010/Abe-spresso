const {JSDOM}=require('jsdom');
const fs=require('node:fs');const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8');
const app=fs.readFileSync(root+'/app.js','utf8');const content=fs.readFileSync(root+'/content.js','utf8');
const results=[];let dom,w,d;
function start(stored=null,denied=false,mutate=null){dom=new JSDOM(html,{url:'http://localhost:4173/#/today',runScripts:'outside-only'});w=dom.window;d=w.document;
 w.scrollTo=({top})=>{w.scrollY=top;w.dispatchEvent(new w.Event('scroll'));};w.HTMLElement.prototype.scrollIntoView=function(){w.lastScrolled=this.id;};w.matchMedia=()=>({matches:false});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 if(denied)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});else if(stored)w.localStorage.setItem('afi-editorial-prototype-v1',stored);
 w.eval(content);if(mutate)mutate(w.AFI_STORIES);w.eval(app);
}
function test(name,fn){fn();results.push(name);}
function q(s){return d.querySelector(s)}function qa(s){return [...d.querySelectorAll(s)]}function click(s){assert(q(s),s);q(s).click();}
async function route(hash){w.location.hash=hash;await new Promise(r=>setTimeout(r,5));}
function select(s,value){q(s).value=value;q(s).dispatchEvent(new w.Event('change',{bubbles:true}));}
const state=()=>JSON.parse(w.localStorage.getItem('afi-editorial-prototype-v1'));
(async()=>{start();
test('12 unique stories, 6 content types, separate valid topics',()=>{assert.equal(w.AFI_STORIES.length,12);assert.equal(Object.keys(w.AFI_TYPES).length,6);for(const s of w.AFI_STORIES){assert(w.AFI_TYPES[s.contentType]);assert(s.topicIds.every(x=>w.AFI_TOPICS[x]));assert.match(s.originalArticle.publishedAt,/^\d{4}-\d{2}-\d{2}$/);assert.notEqual(s.originalArticle.publishedAt,'2026-09-14');assert(!('topic' in s));}});
test('Home: 5 key stories + 7 quick reads, no why explanations, one video',()=>{assert.equal(qa('[data-story]').length,12);assert.equal(qa('.news-main [data-story]').length,5);assert.equal(qa('.why-box').length,0);assert.equal(qa('.quick-list>.quick-story').length,7);assert.equal(qa('.inline-video').length,1);assert(q('#edition-completion'));assert(q('.edition-progress'));assert.equal(qa('iframe').length,0);});
test('Both UI languages preserve exact source headlines, excerpts, dates and direct links',()=>{
 assert(w.AFI_STORIES.every(s=>!['scanWhy','deck','why','what','how','impact'].some(k=>Object.hasOwn(s,k))));
 for(let i=0;i<2;i++){
  assert(!q('.why-box'));assert(!/为什么重要|WHY IT MATTERS/i.test(q('#main').textContent));
  for(const el of qa('[data-story]')){
   const story=w.AFI_STORIES.find(s=>s.id===Number(el.dataset.story));
   const a=story.originalArticle;
   assert.equal(el.querySelector('.story-title a').textContent,a.title);
   assert.equal(el.querySelector('blockquote p').textContent,a.excerpt);
   assert.equal(el.querySelector('blockquote').getAttribute('lang'),a.language);
   assert.equal(el.querySelector('blockquote').getAttribute('cite'),a.url);
   const link=el.querySelector('.story-source a');
   assert.equal(link.href,a.url);assert.equal(link.target,'_blank');assert(link.rel.includes('noopener'));assert(link.rel.includes('noreferrer'));
   assert.equal(el.querySelector('time').dateTime,a.publishedAt);
   assert.equal(el.querySelector('time').textContent,a.publishedAt);
   assert.notEqual(new URL(link.href).pathname,'/');
   assert(el.querySelector('.story-source'));assert(el.querySelector('[data-read]'));assert(el.querySelector('[data-save]'));
  }
  click('[data-action="language"]');
 }
});
test('Homepage removes redundant copy and duplicate actions',()=>{
 assert(!q('.sidebar,.reading-index,.editor-note,.brand-promise,.nav-note,.source-time,.source-meta,.section-intro,.edition-context'));
 assert.equal(qa('.progress-info').length,1);assert.equal(qa('[data-action="continue"]').length,1);
 assert.equal(qa('[data-action="video"]').length,1);assert.equal(qa('.explain-link').length,0);
 assert(!q('[data-nav="today"] span'));assert(!d.body.textContent.includes('DAILY AI BRIEF'));
 assert(q('#prototype-label').textContent.includes('示例'));assert(q('#prototype-label').textContent.includes('本机'));
 assert(qa('[data-story]').every(el=>el.querySelector('.story-source')&&el.querySelector('[data-read]')&&el.querySelector('[data-save]')));
});
test('Editorial DOM is headline-first with honest resource labels',()=>{
 for(const story of qa('.hero-story,.compact-story')) {
  const title=story.querySelector('h3'),image=story.querySelector('.story-image');
  assert(title.compareDocumentPosition(image)&w.Node.DOCUMENT_POSITION_FOLLOWING);
 }
 assert(qa('.story-source').every(el=>el.textContent.startsWith('原文')));
 assert.equal(q('.edition-meta time').getAttribute('datetime'),'2026-09-14');
 assert.equal(q('progress.progress-track').max,12);assert(q('progress').getAttribute('aria-label'));
});
test('Correct slogan in both brand placements and both languages',()=>{
 for(let i=0;i<2;i++){assert.equal(q('.brand-type>span').textContent.trim(),'A daily shot of AI.');assert.equal(q('.footer-brand span').textContent.trim(),'A daily shot of AI.');click('[data-action="language"]');}
});
test('Every local image and stylesheet resolves on disk',()=>{for(const el of qa('img,link[rel="stylesheet"]')){const url=el.getAttribute('src')||el.getAttribute('href');assert(fs.existsSync(root+'/'+url),url);}});
select('#content-type','opensource');test('Type filter preserves editorial order',()=>{assert.deepEqual(qa('[data-story]').map(x=>+x.dataset.story),[4,7,10,12]);assert(q('.filtered-count').textContent.includes('本期共 12'));assert(!q('.why-box'));assert(qa('[data-story]').every(el=>el.querySelector('h3')&&el.querySelector('p')));});
select('#technical-topic','agents');test('Type and topic intersect',()=>assert.deepEqual(qa('[data-story]').map(x=>+x.dataset.story),[4]));
click('[data-story="4"] h3 a');await new Promise(r=>setTimeout(r,5));test('Detail retains filtered-list return link',()=>assert.equal(q('.back-link').getAttribute('href'),'#/today'));
click('.back-link');await new Promise(r=>setTimeout(r,5));test('Return restores filters',()=>{assert.equal(q('#technical-topic').value,'agents');assert.equal(q('#content-type').value,'opensource');});
select('#content-type','concepts');test('No fabricated content to fill empty category',()=>assert(q('.empty-state').textContent.includes('本期没有匹配')));
click('[data-action="reset-filters"]');test('Reset returns all 12',()=>assert.equal(qa('[data-story]').length,12));
click('[data-read="1"]');test('Read does not save',()=>{assert.deepEqual(state().read,[1]);assert.deepEqual(state().saved,[]);});
click('[data-save="4"]');test('Guest save opens explicit demo dialog',()=>{assert(q('#dialog').open);assert(q('[data-action="enter-demo"]'));});click('[data-action="enter-demo"]');test('Demo resumes original save without marking read',()=>{assert.deepEqual(state().saved,[4]);assert.deepEqual(state().read,[1]);});
await route('#/saved');test('Saved is learn-later queue with edition/source links',()=>{assert.equal(qa('[data-story]').length,1);assert(q('.resource-actions a[href="#/briefs/2026-09-14"]'));assert.equal(q('.story-source a[target="_blank"]').href,w.AFI_STORIES[3].originalArticle.url);assert(!q('.why-box'));assert(q('[data-story] p'));});
click('[data-story="4"] h3 a');await new Promise(r=>setTimeout(r,5));test('Saved detail returns to Saved',()=>assert.equal(q('.back-link').getAttribute('href'),'#/saved'));
for(const lang of ['zh','en']){if(d.documentElement.lang!==(lang==='zh'?'zh-CN':'en'))click('[data-action="language"]');for(let id=1;id<=12;id++){await route('#/briefs/2026-09-14/items/'+id);test(lang+' detail '+id+': original excerpt, honest provenance, unique IDs',()=>{assert(q('.detail-title').textContent.length);const sections=qa('.detail-section h2').map(e=>e.textContent);assert.equal(sections.length,1);assert.equal(q('.detail-title').textContent,w.AFI_STORIES[id-1].originalArticle.title);assert.equal(q('.detail-section blockquote p').textContent,w.AFI_STORIES[id-1].originalArticle.excerpt);assert(!/为什么重要|Why it matters/.test(q('#main').textContent));assert.equal(q('.story-source a').href,w.AFI_STORIES[id-1].originalArticle.url);const ids=qa('[id]').map(e=>e.id);assert.equal(new Set(ids).size,ids.length);assert(!q('#main').textContent.includes('undefined'));assert.equal(qa('.inline-video').length,id===11?1:0);assert.equal(qa('[data-action="video"]').length,id===11?1:0);assert(q('.source-disclosure'));assert.equal(qa('.source-facts>div').length,5);assert(q('.article-availability').textContent.includes(lang==='zh'?'当前仅提供原文节选':'Original excerpt only'));assert(q('.source-facts').textContent.includes(w.AFI_STORIES[id-1].originalArticle.verifiedAt));assert(!q('.article-body'));assert(!q('.detail-photo'));assert(q('.detail-toolbar').textContent.includes(lang==='zh'?'原文语言':'Original language'));assert(!q('.source-disclosure').open);assert.equal(qa('[data-read]').length,1);assert(!q('.detail-side'));});}}
click('[data-finish-link]');await new Promise(r=>setTimeout(r,5));test('Last story returns to completion anchor',()=>assert.equal(w.lastScrolled,'edition-completion'));
click('[data-action="language"]');await route('#/archive');test('Archive shows edition progress',()=>assert(q('.archive-progress').textContent.includes('1 / 12')));
select('#archive-month','08');test('Archive empty month has no invented edition',()=>{assert(!q('.archive-card'));assert(q('.empty-state'));});click('[data-action="language"]');test('Language toggle retains archive month',()=>assert.equal(q('#archive-month').value,'08'));
await route('#/today');click('[data-action="search"]');q('#search-input').value='open-source';q('#search-input').dispatchEvent(new w.Event('input',{bubbles:true}));test('Search indexes new type names',()=>assert.equal(qa('.search-result').length,4));q('#search-input').value='no-results-888';q('#search-input').dispatchEvent(new w.Event('input',{bubbles:true}));test('Search empty state',()=>assert.equal(qa('.search-result').length,0));click('[data-action="close"]');
click('[data-action="video"]');test('Video privacy gate has no auto iframe',()=>{assert(!q('iframe'));assert(q('[data-action="load-video"]'));});click('[data-action="load-video"]');test('Video iframe only after consent',()=>assert(q('iframe').src.includes('youtube-nocookie.com')));click('[data-action="close"]');test('Closing video removes iframe',()=>assert(!q('iframe')));
click('[data-action="complete"]');test('Edition completion requires confirmation',()=>{assert.equal(state().read.length,1);assert(q('#dialog').open);});click('[data-action="confirm-complete"]');test('Completion marks 12 read, preserves saved independently',()=>{assert.equal(state().read.length,12);assert.deepEqual(state().saved,[4]);});const persisted=w.localStorage.getItem('afi-editorial-prototype-v1');dom.window.close();start(persisted);test('Reload preserves local records',()=>{assert(q('.progress-info').textContent.includes('12 / 12'));assert.equal(q('#saved-count').textContent,'1');});
await route('#/briefs/2026-09-14/items/999');test('Unknown detail is safe empty state',()=>assert(q('.empty-state')));dom.window.close();start('{broken');test('Malformed storage still renders',()=>assert.equal(qa('[data-story]').length,12));dom.window.close();start(null,true);test('Blocked storage degrades gracefully',()=>{assert(q('.storage-warning'));click('[data-read="1"]');assert(q('.progress-info').textContent.includes('1 / 12'));});dom.window.close();
start(null,false,stories=>{stories[0].originalArticle.excerpt='';stories[0].deck=['DO NOT GENERATE','DO NOT GENERATE'];});
test('Missing excerpt never falls back to generated summary',()=>{assert(q('[data-story="1"] .source-placeholder'));assert(!q('[data-story="1"] blockquote'));assert(!q('#main').textContent.includes('DO NOT GENERATE'));});dom.window.close();
start(null,false,stories=>{stories[0].originalArticle.url='javascript:alert(1)';stories[0].url='javascript:alert(1)';});
test('Unsafe original URL is never rendered as a source link',()=>{assert(!q('[data-story="1"] .story-source a'));assert(!q('[data-story="1"] blockquote'));assert(q('[data-story="1"] h3 a').hash.includes('/items/1'));});dom.window.close();
start(null,false,stories=>{stories[0].originalArticle.title='<img src=x onerror=alert(1)>';stories[0].originalArticle.excerpt='<script>alert(1)</script>';stories[0].originalArticle.publisher='<b>Publisher</b>';stories[0].originalArticle.publishedAt=null;});
test('Source text is escaped; missing publication does not become edition date',()=>{assert.equal(q('[data-story="1"] h3 a').textContent,'<img src=x onerror=alert(1)>');assert(!q('[data-story="1"] h3 img'));assert.equal(q('[data-story="1"] blockquote p').textContent,'<script>alert(1)</script>');assert(!q('[data-story="1"] blockquote script'));assert(!q('[data-story="1"] time'));});dom.window.close();
start();
test('Source evidence ledger covers all 12 records without invented summaries',()=>{const ledger=JSON.parse(fs.readFileSync(root+'/design/news-sources.json'));assert.equal(ledger.length,12);assert.equal(new Set(ledger.map(x=>x.url)).size,12);for(const evidence of ledger){const a=w.AFI_STORIES[evidence.id-1].originalArticle;for(const k of ['title','excerpt','publisher','publishedAt','url'])assert.equal(a[k],evidence[k]);assert.equal(evidence.httpStatus,200);assert(evidence.dateEvidence);assert(evidence.quotedWords<=25);assert.match(evidence.htmlSha256,/^[a-f0-9]{64}$/);}});
click('[data-action="search"]');q('#search-input').value='latency-optimized';q('#search-input').dispatchEvent(new w.Event('input',{bubbles:true}));
test('Search indexes verbatim excerpts and opens the matching internal source detail',()=>{assert.equal(qa('.search-result').length,1);assert(q('.search-result').hash.endsWith('/items/7'));assert.equal(q('.search-result').firstChild.textContent,w.AFI_STORIES[6].originalArticle.title);});dom.window.close();
const articleFixture=require('./fixtures/article-content.cjs');
function startFull(mutate=()=>{}){start(JSON.stringify({demo:true,lang:'zh',saved:[],read:[]}),false,stories=>{stories[0].articleContent=articleFixture(stories[0].originalArticle.url);mutate(stories[0].articleContent,stories[0]);});}
startFull();await route('#/briefs/2026-09-14/items/1');
test('Approved full document renders every block in source order, not the card excerpt',()=>{
 assert(q('.article-body'));assert(!q('.detail-section .ab-source-quote'));
 assert.equal(qa('.article-body > *').length,w.AFI_STORIES[0].articleContent.blocks.length);
 assert(q('.article-body').textContent.includes('complete supplied document reaches the end'));
 assert.equal(qa('.article-body figure').length,1);assert.equal(qa('.article-body table').length,1);
 assert.equal(qa('.article-body script').length,0);assert(q('.article-body').textContent.includes('<script>'));
 assert.equal(q('.article-body').getAttribute('lang'),'en');
 assert(q('.article-body img').getAttribute('src').startsWith('assets/articles/'));
 assert(q('.article-body figcaption').textContent.includes('Created for this regression test'));
 assert.equal(q('.article-body a').target,'_blank');assert(q('.article-body a').rel.includes('noopener'));
 assert(q('.source-facts').textContent.includes('Locally authored QA fixture'));
 assert.equal(qa('[data-read]').length,1);assert.equal(qa('[data-save]').length,1);
});
function sourceBodyText(){const body=q('.article-body').cloneNode(true);body.querySelectorAll('.article-image-fallback').forEach(el=>el.remove());return body.textContent;}
const fullText=sourceBodyText();
click('[data-action="language"]');
test('Language toggle translates reader chrome without changing full source text',()=>{assert.equal(sourceBodyText(),fullText);assert(q('.article-availability').textContent.includes('Full original text'));});
click('.article-jump');
test('Article contents navigation preserves app route and focuses the source heading',()=>{assert.equal(w.location.hash,'#/briefs/2026-09-14/items/1');assert.equal(d.activeElement.id,'article-section-1');assert.equal(w.lastScrolled,'article-section-1');});
q('[data-article-image]').dispatchEvent(new w.Event('error'));
test('Broken original illustration keeps caption and attribution, shows honest fallback',()=>{assert(q('[data-article-image]').hidden);assert(!q('.article-image-fallback').hidden);assert(q('.article-figure').textContent.includes('Abe-spresso · QA fixture'));assert(q('.article-availability').textContent.includes('Some illustrations unavailable'));});
click('[data-save="1"]');test('Full-text save still does not mark read',()=>{assert.deepEqual(state().saved,[1]);assert.deepEqual(state().read,[]);});
click('[data-read="1"]');test('Full-text read retains the independent saved state',()=>{assert.deepEqual(state().saved,[1]);assert.deepEqual(state().read,[1]);});dom.window.close();
for(const [label,mutate] of [
 ['unapproved',doc=>doc.status='pending'],['partial text',doc=>doc.textComplete=false],
 ['missing rights',doc=>delete doc.rights],['invalid rights link',doc=>doc.rights.url='javascript:alert(1)'],
 ['different source',doc=>doc.sourceUrl='https://example.com/other'],['different language',doc=>doc.language='fr'],
 ['impossible date',doc=>doc.checkedAt='2026-02-30'],['check before snapshot',doc=>doc.checkedAt='2026-09-18'],['unknown block',doc=>doc.blocks.push({type:'rawHTML',html:'<iframe></iframe>'})],
 ['unsafe inline link',doc=>doc.blocks[2].content[3].href='javascript:alert(1)'],
 ['malformed table',doc=>doc.blocks[8].rows[0].pop()],['empty document',doc=>doc.blocks=[]]
]) {
 startFull(mutate);await route('#/briefs/2026-09-14/items/1');
 test('Full document rejects '+label+' without inventing or silently truncating text',()=>{assert(!q('.article-body'));assert(q('.ab-source-quote'));assert(q('.article-availability').textContent.includes('当前仅提供原文节选'));assert(!q('iframe'));});dom.window.close();
}
for(const [label,mutate] of [
 ['missing image rights',b=>delete b.rights],['remote image',b=>b.src='https://example.com/tracker.png'],
 ['traversal',b=>b.src='assets/articles/../robot.jpg'],['encoded traversal',b=>b.src='assets/articles/%2e%2e/robot.jpg'],
 ['invalid dimensions',b=>b.width=0],['missing credit',b=>b.credit='']
]) {
 startFull(doc=>mutate(doc.blocks[6]));await route('#/briefs/2026-09-14/items/1');
 test('Full reader preserves image position but does not load '+label,()=>{assert(q('.article-body'));assert(!q('[data-article-image]'));assert(!q('.article-image-fallback').hidden);assert(q('.article-availability').textContent.includes('部分插图不可用'));assert(q('.article-figure figcaption').textContent.includes('Figure 1'));});dom.window.close();
}
startFull(doc=>{doc.blocks[0].content='<img src=x onerror=alert(1)>';doc.blocks[1].text='<svg onload=alert(1)>';doc.blocks[6].caption='<script>caption</script>';doc.blocks[6].credit='<b>credit</b>';doc.rights.notice='<iframe>rights</iframe>';});await route('#/briefs/2026-09-14/items/1');
test('All full-article text surfaces escape source markup',()=>{assert(q('.article-body'));assert.equal(qa('.article-body img').length,1);assert.equal(qa('.article-body svg,.article-body script,#main iframe').length,0);assert(q('.article-body').textContent.includes('<script>caption</script>'));assert(q('.source-facts').textContent.includes('<iframe>rights</iframe>'));});dom.window.close();

console.log(JSON.stringify({passed:results.length,checks:results},null,2));})().catch(e=>{console.error(e);dom?.window.close();process.exitCode=1;});
