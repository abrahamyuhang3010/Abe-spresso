(() => {
'use strict';
const stories = window.AFI_STORIES, $ = s => document.querySelector(s);
const key = 'afi-editorial-prototype-v1';
let storageAvailable = true, stored = {};
try { stored = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { storageAvailable = false; }
const validIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => stories.some(s => s.id === id)))] : [];
let state = {lang:stored.lang === 'en' ? 'en':'zh', demo:stored.demo === true, saved:validIds(stored.saved), read:validIds(stored.read)};
if (!state.demo) state.saved = [];
let topic = 'all', contentType = 'all', archiveMonth = '09', returnRoute = '#/today', pendingAnchor = null, pendingSave = null, returnFocus = null, toastTimer, currentRoute = '', currentScroll = 0;
const scrollPositions = new Map();
const t = (zh,en) => state.lang === 'zh' ? zh : en;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr = pair => pair ? pair[state.lang === 'zh' ? 0 : 1] : '';
const topics = window.AFI_TOPICS, types = window.AFI_TYPES;
const book = '<svg class="bookmark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>';
const check = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg>';
const arrow = '<span aria-hidden="true">↗</span>';
const routeTo = id => `#/briefs/2026-09-14/items/${id}`;
const sourceName = s => state.lang === 'zh' ? s.source : s.sourceEn;
const kindName = s => tr(types[s.contentType]);
const topicNames = s => s.topicIds.map(id=>tr(topics[id])).join(' · ');
const sourceRoleName = s => tr(({primary:['一手发布 / 研究原文','Primary announcement / research'],secondary:['媒体补充','Secondary coverage'],interpretation:['创作者解读','Creator interpretation'],editorial:['编辑思考题','Editorial prompt']})[s.sourceRole]);
const duration = s => s.readingSeconds>=60?`${s.readingSeconds/60} ${t('分钟','min')}`:t('约 30 秒','~30 sec');
const filteredStories = () => stories.filter(s=>(topic==='all'||s.topicIds.includes(topic))&&(contentType==='all'||s.contentType===contentType));
function persist() { try { localStorage.setItem(key, JSON.stringify(state)); } catch {storageAvailable=false; notify(t('浏览器存储不可用；本次操作仅在当前页面有效','Storage is unavailable; changes last only for this page session.'));} }
function notify(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800); }
function savedButton(s,withLabel=false) { const on=state.saved.includes(s.id); return `<button class="ab-button ab-button--quiet tool-button ${on?'is-on':''}" data-save="${s.id}" title="${esc(t(on?'取消收藏':'收藏',on?'Unsave':'Save'))}" aria-pressed="${on}" aria-label="${esc(t(on?'取消收藏：':'收藏：',on?'Unsave: ':'Save: ')+cardTitle(s))}">${book}${withLabel?esc(t(on?'已收藏':'收藏',on?'Saved':'Save')):''}</button>`; }
function readButton(s,withLabel=false) {const on=state.read.includes(s.id);return `<button class="ab-button ab-button--quiet tool-button ${on?'is-on':''}" data-read="${s.id}" title="${esc(t(on?'标为未读':'标为已读',on?'Mark unread':'Mark read'))}" aria-pressed="${on}" aria-label="${esc(t(on?'标为未读：':'标为已读：',on?'Mark unread: ':'Mark read: ')+cardTitle(s))}">${check}${withLabel?esc(t(on?'已读':'标为已读',on?'Read':'Mark read')):''}</button>`;}
function tools(s,labels=false) {return `<div class="story-tools">${readButton(s,labels)}${savedButton(s,labels)}</div>`;}
// Source text is displayed verbatim in its original language, never synthesized from deck.
function safeSourceURL(value) {
 if(typeof value!=='string')return '';
 try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';} catch {return '';}
}
function originalArticle(s) {
 const a=s.originalArticle;
 return a&&typeof a.title==='string'&&a.title.trim()&&typeof a.publisher==='string'&&a.publisher.trim()&&typeof a.language==='string'&&/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(a.language)&&safeSourceURL(a.url)?a:null;
}
const cardTitle = s => originalArticle(s)?.title || tr(s.title);
const cardURL = s => routeTo(s.id);
function cardHeading(s) {
 const a=originalArticle(s);
 return `<h3 class="story-title"${a?` lang="${esc(a.language)}" dir="auto"`:''}><a href="${esc(cardURL(s))}">${esc(cardTitle(s))}</a></h3>`;
}
function cardExcerpt(s) {
 const a=originalArticle(s);
 if(!a)return `<p class="source-placeholder">${t('尚未接入原文摘录','Original excerpt not yet connected')}</p>`;
 if(typeof a.excerpt!=='string'||!a.excerpt.trim())return `<p class="source-placeholder">${t('未提供原文摘录，请阅读原文。','No excerpt provided. Read the original article.')}</p>`;
 return `<div class="source-excerpt"><p class="excerpt-label">${t('原文摘录 · 保留原语言','Original excerpt · Original language')}</p><blockquote class="ab-source-quote" cite="${esc(safeSourceURL(a.url))}" lang="${esc(a.language)}" dir="auto"><p>${esc(a.excerpt)}</p></blockquote></div>`;
}
function cardProvenance(s) {
 const a=originalArticle(s),url=safeSourceURL(a?a.url:s.url);
 const label=a?t('原文','Original'):t('资料','Resource');
 const text=`<span class="resource-label">${label} · </span>${esc(a?a.publisher:sourceName(s))}`;
 const publication=a&&typeof a.publishedAt==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(a.publishedAt)&&Number.isFinite(Date.parse(a.publishedAt))?a.publishedAt:null;
 return `<div class="story-source">${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`:`<span>${text}</span>`}${a?`<span class="source-byline">${typeof a.author==='string'&&a.author.trim()?`${esc(a.author)} · `:''}${publication?`<time datetime="${esc(publication)}">${esc(publication.slice(0,10))}</time>`:t('发布时间未提供','Publication date unavailable')}</span>`:''}</div>`;
}
function image(s,cls='story-image') {return `<a class="${cls}" href="${esc(cardURL(s))}" tabindex="-1" aria-hidden="true"><img src="assets/${s.image}.jpg" alt="" width="800" height="500" ${s.id===1?'fetchpriority="high"':'loading="lazy"'}>${cls==='story-image'?`<span class="photo-label">${s.id===1?t('主题配图 · 非事件现场','Illustrative photograph'):t('示意配图','Illustration')}</span>`:''}</a>`;}
function kicker(s,showNumber=true) {return `<div class="kicker">${showNumber?`<span class="story-number">${String(s.id).padStart(2,'0')}</span>`:''}${esc(kindName(s))}<span aria-hidden="true">/</span><span class="topic-label">${esc(topicNames(s))}</span></div>`;}
function bottom(s) {return `<div class="story-bottom">${cardProvenance(s)}<span>${t('站内','On-site')} · ${duration(s)}</span>${tools(s)}</div>`;}
function cardKicker(s,number=true) {return `${kicker(s,number)}<p class="card-origin">${originalArticle(s)?t('原文标题 · 未改写','Original headline · Unedited'):t('示例标题 · 非原文','Sample headline · Not a source quote')}</p>`;}
function card(s,variant) {return `<article class="${variant} ${state.read.includes(s.id)?'visited':''}" data-story="${s.id}">${cardKicker(s)}${cardHeading(s)}${variant==='hero-story'||variant==='compact-story'?image(s):''}${cardExcerpt(s)}${bottom(s)}</article>`;}
function quick(s,context='brief') {return `<article class="quick-story ${state.read.includes(s.id)?'visited':''} ${s.mediaType==='video'?'has-video':''}" data-story="${s.id}"><span class="quick-number">${String(s.id).padStart(2,'0')}</span><div>${cardKicker(s,false)}${cardHeading(s)}${cardExcerpt(s)}${s.mediaType==='video'?videoResource():''}${bottom(s)}${context==='saved'?`<div class="resource-actions"><a href="#/briefs/2026-09-14">${t('来自 09.14 日报','From the Sep 14 edition')}</a></div>`:''}</div></article>`;}
function videoResource() {return `<div class="inline-video"><button class="inline-video-cover" data-action="video" aria-label="${t('播放视频：大语言模型入门','Play video: Intro to Large Language Models')}"><img src="assets/code.jpg" alt="${t('主题配图，非视频截图','Illustrative cover, not a video frame')}" width="800" height="534" loading="lazy"><span aria-hidden="true">▶</span></button><div><strong>Intro to Large Language Models</strong><p>${t('延伸学习 · 非本条新闻视频；主题配图','Related learning · Not this news event; illustrative cover')}</p></div></div>`;}
function progressPanel() {const n=state.read.length;return `<div class="edition-progress"><div class="progress-info"><span>${t('已读','Read')}</span><strong>${n} / 12</strong></div><progress class="progress-track" aria-label="${t('本期阅读进度','Edition reading progress')}" value="${n}" max="12">${n} / 12</progress><button data-action="continue">${n===12?t('回顾本期','Review edition'):n?t('继续阅读','Continue reading'):t('开始阅读','Start reading')} →</button></div>`;}
function filters() {return `<div class="edition-tools"><div class="edition-jumps"><a href="#top-five" data-jump="top-five">${topic==='all'&&contentType==='all'?'Top 5 <span>01—05</span>':t('筛选结果','Filter results')}</a>${topic==='all'&&contentType==='all'?`<a href="#more-stories" data-jump="more-stories">${t('更多值得关注','Quick reads')} <span>06—12</span></a>`:''}</div><details class="filter-disclosure" ${topic!=='all'||contentType!=='all'?'open':''}><summary>${t('筛选本期','Filter edition')}${topic!=='all'||contentType!=='all'?' •':''}</summary><div class="filter-controls"><label>${t('内容类型','Content type')}<select id="content-type"><option value="all">${t('全部类型','All types')}</option>${Object.entries(types).map(([id,label])=>`<option value="${id}" ${contentType===id?'selected':''}>${esc(tr(label))}</option>`).join('')}</select></label><label>${t('技术主题','Technical topic')}<select id="technical-topic"><option value="all">${t('全部主题','All topics')}</option>${Object.entries(topics).map(([id,label])=>`<option value="${id}" ${topic===id?'selected':''}>${esc(tr(label))}</option>`).join('')}</select></label><button class="video-link" data-action="reset-filters">${t('恢复编辑排序','Reset filters')} ↺</button></div></details></div>`;}
function editionHead() {const historic=location.hash==='#/briefs/2026-09-14';return `${historic?`<a class="back-link" href="#/archive">← ${t('返回往期归档','Back to archive')}</a>`:''}<section class="edition-head"><h1>${historic?t('本期简报','This edition'):t('今日简报','Daily brief')}</h1><div class="edition-meta"><strong><time datetime="2026-09-14">${t('2026 年 9 月 14 日','September 14, 2026')}</time> · ${t('原型期号 · 非新闻日期','Prototype edition · Not publication date')}</strong><span>${t('12 条真实原文 · 历史选编','12 original sources · Historical selection')}</span></div></section>${progressPanel()}`;}
function completion() {const done=state.read.length===12;return `<section class="completion" id="edition-completion"><div><h2>${done?t('本期已读完 ✓','Edition complete ✓'):t('本期简报到这里。','That’s this edition.')}</h2></div><div class="completion-actions">${!done?`<button class="ab-button outline-button" data-action="complete">${t('标记本期已读完','Mark edition complete')}</button>`:''}<a href="#/saved">${t('查看收藏','View Saved')} →</a></div></section>`;}
function today() {const filtered=topic!=='all'||contentType!=='all',list=filteredStories();return `${editionHead()}${filters()}${filtered?`<section class="filter-results" id="top-five"><div class="section-heading"><h2>${t('本期筛选结果','Filtered edition')}</h2></div><p class="filtered-count" role="status">${t(`当前筛选 ${list.length} 条 / 本期共 12 条`,`Showing ${list.length} of 12 stories`)}</p>${list.length?list.map(s=>quick(s)).join(''):`<div class="empty-state"><h2>${t('本期没有匹配的内容','No matching stories in this edition')}</h2><button class="ab-button outline-button" data-action="reset-filters">${t('查看全部 12 条','View all 12 stories')}</button></div>`}</section>`:`<div class="front-grid"><section class="news-main" aria-labelledby="top-five"><div class="section-heading"><h2 id="top-five">Top 5 <span>${t('本期重点','Edition highlights')}</span></h2></div><div class="top-stories">${card(stories[0],'hero-story')}<div class="stacked-stories">${card(stories[1],'compact-story')}${card(stories[2],'compact-story')}</div></div><div class="secondary-stories">${card(stories[3],'secondary-story')}${card(stories[4],'secondary-story')}</div></section></div><section class="more-section" aria-labelledby="more-stories"><div class="section-heading"><h2 id="more-stories">${t('更多值得关注','Quick reads')}</h2><span>${t('7 条速览','7 stories')}</span></div><div class="quick-list">${stories.slice(5).map(s=>quick(s)).join('')}</div></section>`}${completion()}`;}
function heading(title,desc) {return `<div class="page-heading"><h1>${title}</h1><p>${desc}</p></div>`;}
function archiveEmpty() {return `<div class="empty-state"><h2>${t('这个月没有日报','No editions this month')}</h2><p>${t('仅提供 2026 年 9 月的设计示例，不补写未发布的历史。','Only the September 2026 fixture is available. Unpublished history is not fabricated.')}</p></div>`;}
function archive() {return `<section class="page-view">${heading(t('往期归档','Archive'),t('按日期查阅简报。','Browse editions by date.'))}<div class="archive-tools"><label for="archive-month">${t('按月份浏览','Browse by month')}</label><select id="archive-month"><option value="09" ${archiveMonth==='09'?'selected':''}>${t('2026 年 9 月','September 2026')}</option><option value="08" ${archiveMonth==='08'?'selected':''}>${t('2026 年 8 月','August 2026')}</option></select><span id="archive-number">${archiveMonth==='09'?t('1 期示例','1 demo edition'):t('0 期','0 editions')}</span></div><div id="archive-list">${archiveMonth==='09'?archiveEntry():archiveEmpty()}</div></section>`;}
function archiveEntry() {return `<article class="archive-card"><div class="archive-date"><strong>14</strong><span>SEP 2026 · MON</span></div><div><div class="eyebrow">NO. 001 · ${t('原型示例','PROTOTYPE')}</div><h2><a href="#/briefs/2026-09-14">${t('AI 新闻原文选编','AI news: original-source selection')}</a></h2><p>${t('12 条真实新闻 · 2024.10—2025.03 · 原型期号，不是当天新闻','12 real stories · Oct 2024–Mar 2025 · Prototype edition, not news of that day')}</p><p class="archive-progress">${t('本机阅读进度','Local reading progress')} ${state.read.length} / 12 ${state.read.length===12?'✓':''}</p><a class="video-link" href="#/briefs/2026-09-14">${t('打开这期日报','Open this edition')} →</a></div><img src="assets/robot.jpg" alt="${t('机器人主题配图','Robot illustrative photograph')}" width="300" height="190"></article>`;}
function saved() {return `<section class="page-view">${heading(t('我的收藏','Saved'),t('留待以后深入阅读。收藏仅保存在本机。','For a deeper read later. Saved on this device only.'))}${!state.demo?`<div class="empty-state">${book}<h2>${t('为值得深入的内容，留个位置','Make room for a deeper read')}</h2><p>${t('进入本机演示即可收藏，不会创建真实账号。','Enter the local demo to save stories. No real account is created.')}</p><button class="ab-button ab-button--primary solid-button" data-action="account">${t('进入收藏演示','Try saving locally')} →</button></div>`:state.saved.length?`<h2 class="filtered-count">${state.saved.length} ${t('条收藏 · 本机演示','saved resources · Local demo')}</h2>${[...state.saved].reverse().map(id=>quick(stories.find(s=>s.id===id),'saved')).join('')}<div class="saved-return"><a class="video-link" href="#/today">${t('返回今日简报','Back to Today')} →</a></div>`:`<div class="empty-state">${book}<h2>${t('你的稍后阅读清单，从这里开始','Your reading list starts here')}</h2><p>${t('点击条目旁的书签图标，就能将内容留到以后再读。','Click the bookmark next to a story to keep it for another time.')}</p><a class="ab-button ab-button--primary solid-button" href="#/today">${t('去读今日简报','Explore today’s brief')} →</a></div>`}</section>`;}
// Approved source documents only. This validates display shape, not legal permission.
const hasText = value => typeof value === 'string' && !!value.trim();
function validDate(value) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function validRights(rights) {
 return rights&&['permission','open-license','public-domain'].includes(rights.basis)&&hasText(rights.notice)&&(!rights.url||!!safeSourceURL(rights.url));
}
function validInline(content) {
 return hasText(content)||(Array.isArray(content)&&content.length>0&&content.length<=500&&content.some(run=>run&&hasText(run.text))&&content.every(run=>run&&typeof run.text==='string'&&run.text.length>0&&(!run.href||!!safeSourceURL(run.href))&&(run.strong===undefined||typeof run.strong==='boolean')&&(run.emphasis===undefined||typeof run.emphasis==='boolean')));
}
function inlineSource(content) {
 if(typeof content==='string')return esc(content);
 return content.map(run=>{
  let text=esc(run.text);
  if(run.strong)text=`<strong>${text}</strong>`;
  if(run.emphasis)text=`<em>${text}</em>`;
  return run.href?`<a href="${esc(safeSourceURL(run.href))}" target="_blank" rel="noopener noreferrer">${text}</a>`:text;
 }).join('');
}
function articleImageURL(value) {
 // Approved images are self-hosted: no arbitrary third-party tracking or source HTML.
 return typeof value==='string'&&/^assets\/articles\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|gif)$/i.test(value)?value:'';
}
function availableFigure(block) {
 return !!articleImageURL(block.src)&&validRights(block.rights)&&hasText(block.credit)&&Number.isInteger(block.width)&&block.width>0&&block.width<=20000&&Number.isInteger(block.height)&&block.height>0&&block.height<=20000;
}
function fullArticle(s) {
 const a=originalArticle(s), doc=s.articleContent;
 if(!a||!doc||doc.schemaVersion!==1||doc.status!=='approved'||doc.textComplete!==true||safeSourceURL(doc.sourceUrl)!==safeSourceURL(a.url)||doc.language!==a.language||!validDate(doc.capturedAt)||!validDate(doc.checkedAt)||doc.checkedAt<doc.capturedAt||!validRights(doc.rights)||!Array.isArray(doc.blocks)||!doc.blocks.length||doc.blocks.length>2000)return null;
 let sectionSeen=false, hasBody=false;
 for(const b of doc.blocks) {
  if(!b||typeof b!=='object')return null;
  if(b.type==='heading') {
   if(!hasText(b.text)||![2,3].includes(b.level)||(b.level===3&&!sectionSeen))return null;
   if(b.level===2)sectionSeen=true;
  } else if(['paragraph','quote'].includes(b.type)) {
   if(!validInline(b.content)||(b.attribution!==undefined&&typeof b.attribution!=='string'))return null;
   hasBody=true;
  } else if(b.type==='list') {
   if(typeof b.ordered!=='boolean'||!Array.isArray(b.items)||!b.items.length||b.items.length>500||!b.items.every(validInline))return null;
   hasBody=true;
  } else if(b.type==='code') {
   if(!hasText(b.text))return null;
   hasBody=true;
  } else if(b.type==='table') {
   if(!hasText(b.caption)||!Array.isArray(b.headers)||!b.headers.length||b.headers.length>20||!b.headers.every(validInline)||!Array.isArray(b.rows)||!b.rows.length||b.rows.length>500||!b.rows.every(row=>Array.isArray(row)&&row.length===b.headers.length&&row.every(validInline)))return null;
   hasBody=true;
  } else if(b.type==='image') {
   if(!hasText(b.alt)||(b.caption!==undefined&&typeof b.caption!=='string'))return null;
   // Missing/unauthorized images stay in their original position as explicit placeholders.
  } else return null; // Never silently discard an unsupported part of the original.
 }
 return hasBody?doc:null;
}
function articleBlocks(doc) {
 return doc.blocks.map((b,i)=>{
  if(b.type==='heading')return `<h${b.level+1} id="article-section-${i}" tabindex="-1">${esc(b.text)}</h${b.level+1}>`;
  if(b.type==='paragraph')return `<p>${inlineSource(b.content)}</p>`;
  if(b.type==='quote')return `<blockquote><p>${inlineSource(b.content)}</p>${b.attribution?`<footer>${esc(b.attribution)}</footer>`:''}</blockquote>`;
  if(b.type==='list')return `<${b.ordered?'ol':'ul'}>${b.items.map(item=>`<li>${inlineSource(item)}</li>`).join('')}</${b.ordered?'ol':'ul'}>`;
  if(b.type==='code')return `<pre tabindex="0" aria-label="${t('原文代码，可横向滚动','Original code, horizontally scrollable')}"><code>${esc(b.text)}</code></pre>`;
  if(b.type==='table')return `<div class="article-table" role="region" tabindex="0" aria-label="${esc(b.caption)}"><table><caption>${esc(b.caption)}</caption><thead><tr>${b.headers.map(cell=>`<th scope="col">${inlineSource(cell)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row=>`<tr>${row.map(cell=>`<td>${inlineSource(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const available=availableFigure(b);
  return `<figure class="article-figure${available?'':' is-unavailable'}">${available?`<img src="${esc(articleImageURL(b.src))}" alt="${esc(b.alt)}" width="${b.width}" height="${b.height}" loading="lazy" decoding="async" data-article-image>`:''}<p class="article-image-fallback"${available?' hidden':''} lang="${t('zh-CN','en')}">${t('原文插图暂不可用，请到原文查看。','Original illustration unavailable. View it at the source.')} <span lang="${esc(doc.language)}" dir="auto">${esc(b.alt)}</span></p><figcaption>${b.caption?`<span>${esc(b.caption)}</span>`:''}${hasText(b.credit)?`<span>${esc(b.credit)}</span>`:''}${available?`<span>${esc(b.rights.notice)}</span>`:''}</figcaption></figure>`;
 }).join('');
}
function articleContents(doc) {
 const headings=doc.blocks.map((block,index)=>({...block,index})).filter(b=>b.type==='heading'&&b.level===2);
 if(headings.length<2)return '';
 return `<nav class="article-contents" aria-label="${t('原文目录','Article contents')}"><details><summary>${t('文章目录','On this page')} · ${headings.length}</summary><ol>${headings.map(b=>`<li><button class="article-jump" data-action="article-section" data-section="article-section-${b.index}" lang="${esc(doc.language)}" dir="auto">${esc(b.text)}</button></li>`).join('')}</ol></details></nav>`;
}
function sourceFacts(s,doc) {
 const a=originalArticle(s);
 const facts=[
  [t('来源角色','Source role'),sourceRoleName(s)],
  [t('原始发布时间','Original publication'),a?.publishedAt||t('未提供','Unavailable')],
  [t('标题与摘录核对','Headline & excerpt check'),a?.verifiedAt||t('未提供核对时间','Check date unavailable')],
  [t('核对范围','Verification scope'),a?t('已核对原文页面、标题、短摘录和发布日期；不代表独立验证作者的主张。','Source page, headline, excerpt and publication date checked; author claims are not independently verified.'):t('未接入可核验原文','No verifiable original connected')]
 ];
 if(doc)facts.push([t('正文快照','Article snapshot'),doc.capturedAt],[t('正文完整性核对','Text completeness check'),doc.checkedAt],[t('转载说明','Reuse notice'),doc.rights.notice]);
 else facts.push([t('全文与插图','Full text & illustrations'),t('尚未接入经批准的完整正文与原文插图。','An approved full article and original illustrations have not been connected.')]);
 return `<dl class="source-facts">${facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${doc?.rights.url?`<a class="article-rights-link" href="${esc(safeSourceURL(doc.rights.url))}" target="_blank" rel="noopener noreferrer">${t('查看转载依据','View reuse terms')} ↗</a>`:''}`;
}
function detail(s) {
 if(!s)return notFound();
 const a=originalArticle(s),doc=fullArticle(s),missingImages=doc?.blocks.some(b=>b.type==='image'&&!availableFigure(b));
 const back=['#/today','#/saved','#/briefs/2026-09-14'].includes(returnRoute)?returnRoute:'#/today';
 const next=stories[stories.indexOf(s)+1];
 return `<a class="back-link" href="${back}">← ${back==='#/saved'?t('返回我的收藏','Back to Saved'):t('返回本期简报','Back to the edition')}</a>
 <div class="detail-layout"><article>
  <header class="detail-header">${cardKicker(s)}<h1 class="detail-title"${a?` lang="${esc(a.language)}" dir="auto"`:''}>${esc(cardTitle(s))}</h1>
   <div class="detail-toolbar"><span>${esc(sourceRoleName(s))}</span><span>${t('原文语言','Original language')} · ${esc(a?.language||t('未知','Unknown'))}</span><span>${doc?t('原文正文 · 未改写','Original text · Unedited'):duration(s)+' · '+t('站内摘录阅读','on-site excerpt')}</span></div>
   ${cardProvenance(s)}
  </header>
  <div class="article-availability" role="note"><strong>${doc?(missingImages?t('正文已接入 · 部分插图不可用','Full text available · Some illustrations unavailable'):t('原文全文','Full original text')):t('当前仅提供原文节选','Original excerpt only')}</strong><p>${doc?t('按原文顺序保留正文与插图位置；以下内容为原语言，界面切换不会翻译原文。','Text and illustration positions follow the original. Switching the interface language does not translate the article.'):t('本文尚未接入可展示的完整正文与原文插图。请通过上方原文链接继续阅读；本站不以生成内容补齐。','The full article and original illustrations are not available here yet. Follow the source link above to continue reading; no generated content is used to fill the gaps.')}</p></div>
  ${doc?articleContents(doc):''}
  <section class="detail-section" aria-labelledby="article-body-title"><h2 id="article-body-title">${doc?t('原文正文','Original article'):t('原文节选','From the original')}</h2>${doc?`<div class="article-body" lang="${esc(doc.language)}" dir="auto">${articleBlocks(doc)}</div>`:cardExcerpt(s)}</section>
  <section class="source-box"><h2>${t('来源与转载说明','Source & reuse')}</h2><details class="source-disclosure"><summary>${t('来源说明与核验状态','Source details & verification')}</summary>${sourceFacts(s,doc)}<p>${t('这是历史真实来源选编，不是实时采集。来源发布时的产品状态不代表当前状态；分类和精选排序由本站编排。','This is a historical source selection, not a live feed. Product information reflects publication time, not necessarily today. Categories and ordering are editorial metadata.')}</p><p class="article-edition-note">${t('原型期号 2026.09.14 · 非新闻日期','Prototype edition 2026.09.14 · Not publication date')}</p></details></section>
  ${s.mediaType==='video'?`<section class="detail-related"><h2>${t('延伸学习','Related learning')}</h2>${videoResource()}</section>`:''}
  <div class="detail-finish"><p class="detail-state-note">${t('已读仅记录本条阅读状态；收藏用于稍后深入，两者独立。','Read records your progress on this item; save keeps it for later. The two are independent.')}</p>${tools(s,true)}<div class="detail-navigation"><a href="${back}">← ${t('返回列表','Back to list')}</a>${next?`<a href="${routeTo(next.id)}">${t('下一条','Next story')} →</a>`:`<a href="#/briefs/2026-09-14" data-finish-link>${t('回到本期完成区','Return to edition completion')} ✓</a>`}</div></div>
 </article></div>`;
}
function notFound() {return `<div class="empty-state"><h1>${t('这份内容不在示例中','This page is not in the prototype')}</h1><p>${t('原型只提供 2026 年 9 月 14 日的一份示例日报。','The prototype contains a single demo edition for September 14, 2026.')}</p><a class="ab-button ab-button--primary solid-button" href="#/today">${t('返回简报','Back to the brief')}</a></div>`;}
function updateChrome(nav) {
 document.documentElement.lang=state.lang==='zh'?'zh-CN':'en';document.body.dataset.lang=state.lang;
 $('#prototype-label').textContent=t('原型示例 · 真实原文选编（2024.10—2025.03），非实时新闻 · 记录仅存本机','Prototype · Real sources (Oct 2024–Mar 2025), not live news · Records stay on this device');
 $('#prototype-about').textContent=t('关于此原型 ↗','About this prototype ↗');
 $('#account-button').innerHTML=state.demo?t('演示读者 · 本机','Demo · Local'):t('本机演示 <span>↗</span>','Local demo <span>↗</span>');
 $('[data-action="language"]').innerHTML=state.lang==='zh'?'中 <span>/</span> EN':'EN <span>/</span> 中';
 document.querySelectorAll('[data-nav]').forEach(a=>{let n=a.dataset.nav;a.classList.toggle('active',n===nav);if(n===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.innerHTML=({today:t('今日简报','Today'),archive:t('往期归档','Archive'),saved:t('我的收藏','Saved')})[n]+(n==='saved'?`<small id="saved-count">${state.saved.length||''}</small>`:'');});
 $('#principles-link').textContent=t('编辑原则','Editorial principles');$('#sources-link').textContent=t('来源与素材','Sources & credits');$('#privacy-link').textContent=t('隐私说明','Privacy');$('#archive-footer').textContent=t('日报归档 ↗','Archive ↗');$('#footer-disclaimer').textContent=t('独立设计原型 · 与 Reuters 无关联','Independent prototype · Not affiliated with Reuters');
}
function render(preserveScroll=false) {
 const y=window.scrollY,route=location.hash||'#/today';let html,nav='today',s;
 if(route==='#/today'||route==='#/briefs/2026-09-14'){html=today();if(route==='#/briefs/2026-09-14')nav='archive';}
 else if(route==='#/archive'){html=archive();nav='archive';}
 else if(route==='#/saved'){html=saved();nav='saved';}
 else if(/^#\/briefs\/2026-09-14\/items\/\d+$/.test(route)){s=stories.find(x=>x.id===Number(route.split('/').pop()));html=detail(s);if(returnRoute==='#/saved')nav='saved';else if(returnRoute==='#/briefs/2026-09-14')nav='archive';}
 else html=notFound();
 $('#main').innerHTML=(!storageAvailable?`<p class="storage-warning">${t('浏览器存储不可用，阅读状态仅在当前页面会话有效。','Browser storage is unavailable. Reading state lasts for this page session only.')}</p>`:'')+html;
 updateChrome(nav);document.title=(s?cardTitle(s):({today:t('今日简报','Today'),saved:t('我的收藏','Saved'),archive:t('往期归档','Archive')})[nav])+' — Abe-spresso';
 if(preserveScroll)window.scrollTo({top:y,behavior:'instant'});
}
function openDialog(html,wide=false) {returnFocus=document.activeElement;const dlg=$('#dialog');dlg.classList.toggle('video-dialog',wide);$('#dialog-content').innerHTML=html;dlg.showModal();dlg.scrollTop=0;$('.dialog-close').focus({preventScroll:true});}
function closeDialog(){ $('#dialog').close(); }
$('#dialog').addEventListener('close',()=>{ $('#dialog-content').innerHTML='';pendingSave=null; if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else if(returnFocus){const selector=returnFocus.dataset.save?`[data-save="${returnFocus.dataset.save}"]`:returnFocus.dataset.action?`[data-action="${returnFocus.dataset.action}"]`:null;((selector&&document.querySelector(selector))||$('#main')).focus({preventScroll:true});} });
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function login(){if(state.demo){openDialog(`<div class="dialog-kicker">LOCAL DEMO</div><h2 id="dialog-title">${t('你好，演示读者。','Hello, demo reader.')}</h2><p>${t('这不是真实账号。收藏与阅读记录只存在当前浏览器。退出演示会清除本机收藏与进度，正式产品的跨设备同步尚未接入。','This is not a real account. Saves and reading records live in this browser only. Leaving the demo clears local saves and progress. Cloud sync is not connected.')}</p><button class="ab-button outline-button" data-action="logout">${t('退出演示并清除本机记录','Leave demo and clear local records')}</button>`);return;}
 openDialog(`<div class="dialog-kicker">A LITTLE LESS NOISE</div><h2 id="dialog-title">${t('好内容，留着慢慢读。','Keep the good stuff for later.')}</h2><p>${t('正式产品登录后可收藏内容，并在不同设备继续阅读。当前原型未连接登录服务，你可以先体验本机演示。','The production product will let you save stories and continue across devices. Sign-in is not connected in this prototype; try the local demo instead.')}</p><ul><li>${t('收藏论文、开源项目和视频','Save papers, open-source projects and videos')}</li><li>${t('记住这台设备上的阅读进度','Keep reading progress on this device')}</li><li>${t('不收集邮箱，不创建真实账号','No email collection. No real account creation.')}</li></ul><button class="ab-button ab-button--primary solid-button" data-action="enter-demo">${t('进入本机演示','Enter local demo')} →</button><p class="fine-print">${t('所有演示数据仅存于浏览器；不代表登录成功或已跨设备同步。','All demo data stays in browser storage. This does not represent a successful login or cross-device sync.')}</p>`);
}
function video(){openDialog(`<div class="dialog-kicker">WATCH & UNDERSTAND</div><h2 id="dialog-title">Intro to Large Language Models</h2><p>Andrej Karpathy · YouTube · ${t('延伸学习 · 非本条新闻视频','Related learning · Not this news event')}</p><div class="video-stage" id="video-stage"><span>▶</span><p>${t('视频来自 YouTube。加载后会连接第三方网站，需要网络访问。','This video is hosted on YouTube. Loading it connects to a third-party service and requires network access.')}</p><button class="ab-button ab-button--primary solid-button" data-action="load-video">${t('加载 YouTube 播放器','Load YouTube player')}</button></div><p class="fine-print">${t('未获取获准文字稿，不提供全文总结或编造时间码。若播放器无法访问或被禁止嵌入，请打开原视频。','No authorized transcript was processed; no full-video summary or invented timestamps are provided. If playback is blocked or unavailable, open the original video.')}</p><a class="video-link" href="https://www.youtube.com/watch?v=zjkBMFhNj_g" target="_blank" rel="noopener noreferrer">${t('在 YouTube 打开原视频','Open original on YouTube')} ↗</a>`,true);}
function info(kind) {const data={about:[t('关于这份设计原型','About this prototype'),t('Abe-spresso：Abe + espresso，每天一小杯高浓度 AI 新闻。依据原项目两份 PRD 制作，以新闻编辑式多栏布局呈现一份 12 条的固定日报。借鉴 Reuters 的视觉方向，不复制其商标或文章；实际首页访问受设备验证限制。','Abe-spresso blends Abe + espresso: a daily shot of AI. Based on the original project’s two PRDs, this editorial layout presents a fixed 12-story brief. The direction references Reuters without copying its trademarks or articles; live homepage access was blocked by a device check.'),t('12 条内容已替换为 2024 年 10 月至 2025 年 3 月的真实原文，标题和短摘录不改写。2026 年 9 月 14 日仅为保留的原型期号，不是新闻发生日期。没有实时采集、真实登录或云端发布。','The 12 stories use real sources from October 2024 through March 2025, with unedited headlines and short excerpts. September 14, 2026 remains the prototype edition identifier, not the news date. No live ingestion, real sign-in or cloud publishing is connected.')],principles:[t('值得信任，先从说清楚开始。','Trust starts with clarity.'),t('事实与解读分开，优先回到原始资料。同一事件不重复占位，不把资料数量当作独立验证数量。','Separate facts from interpretation and return to original resources. Do not repeat a single event or confuse multiple resources with independent verification.'),t('固定一期，可以读完。没有合格内容不凑数，没有正文不编造总结；本文案为演示原则，不代表已执行自动核验。','A fixed edition you can finish. No padding and no invented summaries. These are prototype principles, not a claim of completed automated verification.')],privacy:[t('留在本机的演示数据','Demo data stays on this device'),t('本原型仅用 localStorage 保存语言选择、演示身份、收藏和已读条目 ID。不接收真实账号，不上传阅读状态，不设置分析追踪。退出演示可清除收藏和进度。','This prototype uses localStorage only for language, demo identity, saved IDs and read IDs. No real account, uploaded reading state or analytics tracking. Leaving the demo clears saves and progress.'),t('图片随原型保存在本地。只有点击原文链接或确认加载 YouTube 播放器后，才会连接相应第三方服务。','Images are stored with the prototype. Opening a source link or confirming the YouTube player connects to that third-party service.')],sources:[t('来源与素材说明','Sources and media credits'),t('四张主题照片来自 Unsplash：机器人、机房、电路板、代码屏幕。所有图片均为示意配图，不是具体产品或事件现场。来源地址列于项目 README。','Four thematic photos from Unsplash: robot, servers, circuit board and code. These are illustrative photographs, not specific products or event scenes. Source addresses are listed in the README.'),t('视频：Andrej Karpathy 的 Intro to Large Language Models，以 YouTube 官方播放器按需嵌入，保留外部观看路径。卡片为代码主题封面，不是视频截图。新闻来源链接直达对应原文；这段视频仅作基础知识延伸，不是 DeepSeek 新闻视频或该论文的证据。','Video: Andrej Karpathy’s Intro to Large Language Models, embedded on demand through YouTube with an external viewing link. The code-themed cover is not a video frame. News source links go directly to the original articles. This video is background learning, not a DeepSeek news video or evidence for the paper.')]};const [title,...paras]=data[kind];openDialog(`<div class="dialog-kicker">Abe-spresso</div><h2 id="dialog-title">${title}</h2>${paras.map(p=>`<p>${p}</p>`).join('')}`);}
function search(){openDialog(`<div class="dialog-kicker">FIND YOUR SIGNAL</div><h2 id="dialog-title">${t('在本期中找一找','Search this edition')}</h2><label class="photo-caption" for="search-input">${t('搜索原文标题、摘录或主题','Search original headlines, excerpts or topics')}</label><input class="search-input" id="search-input" type="search" placeholder="${t('例如：Agent、模型、视频','Try Agent, model, video')}" autocomplete="off"><div class="search-results" id="search-results"></div>`);searchResults('');$('#search-input').focus();}
function searchResults(q){const words=q.trim().toLowerCase();const results=stories.filter(s=>[originalArticle(s)?.title||s.title.join(' '),originalArticle(s)?.excerpt||'',originalArticle(s)?.publisher||'',...s.topicIds.flatMap(id=>topics[id]),...types[s.contentType],s.mediaType==='video'?'视频 video':'',s.source,s.sourceEn].join(' ').toLowerCase().includes(words));$('#search-results').innerHTML=results.length?results.map(s=>`<a class="search-result" href="${esc(cardURL(s))}" data-close-link>${esc(cardTitle(s))}<small>${esc(kindName(s))} · ${esc(sourceName(s))}</small></a>`).join(''):`<p>${t('本期没有匹配结果。试试“模型”或“Agent”。','No matches in this edition. Try “model” or “Agent”.')}</p>`;}
document.addEventListener('input',e=>{if(e.target.id==='search-input')searchResults(e.target.value);});
document.addEventListener('change',e=>{
 if(e.target.id==='archive-month'){archiveMonth=e.target.value;render(true);$('#archive-month').focus({preventScroll:true});}
 if(e.target.id==='content-type'||e.target.id==='technical-topic'){const id=e.target.id;if(id==='content-type')contentType=e.target.value;else topic=e.target.value;render(true);$('#'+id).focus({preventScroll:true});}
});
document.addEventListener('click',e=>{
 const target=e.target.closest('button,a');if(!target)return;
 if(target.classList.contains('skip-link')){e.preventDefault();$('#main').focus();return;}
 if(target.hasAttribute('data-close-link'))closeDialog();
 if(target.dataset.jump){e.preventDefault();if(topic!=='all'||contentType!=='all'){topic='all';contentType='all';render(true);}const anchor=document.getElementById(target.dataset.jump);anchor?.scrollIntoView({behavior:'instant',block:'start'});anchor?.setAttribute('tabindex','-1');anchor?.focus({preventScroll:true});return;}
 if(target.getAttribute('href')==='#/briefs/2026-09-14'&&location.hash==='#/archive'){topic='all';contentType='all';}
 if(target.matches('a[href*="/items/"]')&&!location.hash.includes('/items/'))returnRoute=location.hash||'#/today';
 if(target.hasAttribute('data-finish-link')){topic='all';contentType='all';pendingAnchor='edition-completion';}
 if(target.dataset.save){const id=Number(target.dataset.save);if(!stories.some(s=>s.id===id))return;if(!state.demo){login();pendingSave=id;return;}const on=state.saved.includes(id);state.saved=on?state.saved.filter(x=>x!==id):[...state.saved,id];persist();render(true);(document.querySelector(`[data-save="${id}"]`)||document.querySelector('[data-save]')||$('#main')).focus({preventScroll:true});notify(t(on?'已从本机收藏移除':'已加入本机收藏 · 未同步云端',on?'Removed from local saves':'Saved on this device · Not synced'));return;}
 if(target.dataset.read){const id=Number(target.dataset.read);if(!stories.some(s=>s.id===id))return;const on=state.read.includes(id);state.read=on?state.read.filter(x=>x!==id):[...state.read,id];persist();render(true);document.querySelector(`[data-read="${id}"]`)?.focus({preventScroll:true});notify(t(on?'已标为未读':'已标为已读 · 本机记录',on?'Marked unread':'Marked read · Local record'));return;}
 const action=target.dataset.action;
 if(['about','principles','privacy','sources'].includes(action))info(action);
 else if(action==='close')closeDialog();
 else if(action==='reset-filters'){topic='all';contentType='all';render(true);$('.filter-disclosure summary')?.focus({preventScroll:true});}
 else if(action==='article-section'){const section=document.getElementById(target.dataset.section);if(section?.closest('.article-body')){section.scrollIntoView({block:'start',behavior:'instant'});section.focus({preventScroll:true});}}
 else if(action==='search')search();
 else if(action==='account')login();
 else if(action==='language'){state.lang=state.lang==='zh'?'en':'zh';persist();render(true);}
 else if(action==='enter-demo'){const id=pendingSave;state.demo=true;if(id&&!state.saved.includes(id))state.saved.push(id);persist();closeDialog();render(true);notify(t(id?'已进入演示，原条目已加入本机收藏':'已进入本机演示 · 无云端账号',id?'Demo started. The story is saved locally.':'Local demo started · No cloud account'));}
 else if(action==='logout'){state.demo=false;state.saved=[];state.read=[];persist();closeDialog();render(true);notify(t('已退出演示并清除本机记录','Demo ended. Local records cleared.'));}
 else if(action==='continue'){const next=stories.find(s=>!state.read.includes(s.id))||stories[0];if(!location.hash.includes('/items/'))returnRoute=location.hash||'#/today';location.hash=routeTo(next.id);}
 else if(action==='complete'){if(state.read.length===12){notify(t('这期已完成，记录保存在本机','This edition is complete on this device.'));return;}openDialog(`<div class="dialog-kicker">A BRIEF YOU CAN FINISH</div><h2 id="dialog-title">${t('本期已经读完了吗？','Finished this edition?')}</h2><p>${t('确认后会把这份固定示例日报中的 12 条内容标记为已读。完成记录只保存在本机。','Confirm to mark all 12 stories in this fixed demo edition as read. The completion record stays on this device.')}</p><button class="ab-button ab-button--primary solid-button" data-action="confirm-complete">${t('确认，本期已读完','Yes, mark this edition complete')} ✓</button>`);}
 else if(action==='confirm-complete'){state.read=stories.map(s=>s.id);persist();closeDialog();render(true);notify(t('本期 12 / 12 已读 · 明天再见','12 / 12 read · See you tomorrow'));}
 else if(action==='top')window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 else if(action==='video')video();
 else if(action==='load-video'){$('#video-stage').innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/zjkBMFhNj_g?rel=0" title="Intro to Large Language Models — Andrej Karpathy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;$('#dialog').scrollTop=0;$('.dialog-close').focus({preventScroll:true});}
});
// Error events do not bubble; retain the caption and credit when an original image fails.
$('#main').addEventListener('error',event=>{
 if(!event.target.matches?.('img[data-article-image]'))return;
 const figure=event.target.closest('figure');
 event.target.hidden=true;figure.classList.add('is-unavailable');
 figure.querySelector('.article-image-fallback').hidden=false;
 const availability=figure.closest('article').querySelector('.article-availability strong');
 if(availability)availability.textContent=t('正文已接入 · 部分插图不可用','Full text available · Some illustrations unavailable');
},true);
window.addEventListener('scroll',()=>{currentScroll=window.scrollY;},{passive:true});
window.addEventListener('hashchange',()=>{scrollPositions.set(currentRoute,currentScroll);if($('#dialog').open)closeDialog();render();currentRoute=location.hash||'#/today';const y=scrollPositions.get(currentRoute)||0;$('#main').focus({preventScroll:true});if(pendingAnchor){const anchor=document.getElementById(pendingAnchor);anchor?.setAttribute('tabindex','-1');anchor?.scrollIntoView({block:'start',behavior:'instant'});anchor?.focus({preventScroll:true});pendingAnchor=null;}else window.scrollTo({top:y,behavior:'instant'});currentScroll=window.scrollY;});
window.addEventListener('storage',e=>{if(e.key===key){try {const next=JSON.parse(e.newValue||'{}');state={...state,demo:next.demo===true,saved:next.demo?validIds(next.saved):[],read:validIds(next.read)};render(true);}catch{/* Ignore malformed storage from another tab. */}}});
currentRoute=location.hash||'#/today';render();
})();
