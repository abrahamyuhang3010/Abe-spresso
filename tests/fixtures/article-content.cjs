/* Original, locally authored QA document. Never load this fixture into production content.js. */
module.exports = function articleFixture(sourceUrl,language='en') {
 return {
  schemaVersion:1,status:'approved',sourceUrl,language,textComplete:true,
  capturedAt:'2026-09-19',checkedAt:'2026-09-19',
  rights:{basis:'permission',notice:'Locally authored QA fixture — not a reproduced news article.'},
  blocks:[
   {type:'paragraph',content:'Reader test document / 阅读器测试文档。This locally authored text checks layout and interactions; it is not the original text of any news item. The production edition remains excerpt-only until approved source documents are supplied.'},
   {type:'heading',level:2,text:'Text, structure and original order / 正文结构'},
   {type:'paragraph',content:[{text:'Keep the original order, '},{text:'including emphasis',strong:true},{text:', and a '},{text:'source reference',href:'https://example.com/reader-reference'},{text:'. <script>Text is escaped, never executed.</script>'}]},
   {type:'list',ordered:false,items:['First, verify the supplied source document.','Second, check the rights for each illustration separately.','Finally, retain the original captions and attribution.']},
   {type:'heading',level:3,text:'Quotations / 引文'},
   {type:'quote',content:'A reader should never confuse a missing image with a complete reproduction.',attribution:'Original QA copy'},
   {type:'image',src:'assets/articles/reader-fixture.png',width:1200,height:540,alt:'QA diagram: source, review, reader',caption:'Figure 1. A locally drawn reader-test diagram, not a news illustration.',credit:'Abe-spresso · QA fixture',rights:{basis:'permission',notice:'Created for this regression test.'}},
   {type:'heading',level:2,text:'Tables and code / 表格与代码'},
   {type:'table',caption:'Reader test states',headers:['Mode','Text','Illustrations'],rows:[['Full text','Approved source text','Individually approved images'],['Excerpt','Existing short quotation','No invented illustration']]},
   {type:'code',text:'const reader = { mode: "source", rewrite: false };\n// A deliberately long line tests local scrolling: '+ 'original_content_'.repeat(14)},
   {type:'heading',level:2,text:'Reading state / 阅读状态'},
   {type:'list',ordered:true,items:['Opening the source does not automatically mark the item read.','Saving and reading remain independent.']},
   {type:'paragraph',content:'本段是原创测试文字，用于验证中文排版、长文阅读字号与混合语言换行。切换界面语言不会改写正文，也不会变更原文日期。This final paragraph verifies that the complete supplied document reaches the end of the page.'}
  ]
 };
};
