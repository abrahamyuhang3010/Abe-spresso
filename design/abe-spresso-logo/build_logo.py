"""Build the Abe-spresso logo proposal. Requires fontTools; no font files are redistributed."""
from pathlib import Path
from html import escape
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent
FONTS = Path('/System/Library/Fonts/Supplemental')
fonts = {k: TTFont(FONTS / f) for k, f in {
    'brand': 'DIN Condensed Bold.ttf',
    'label': 'DIN Alternate Bold.ttf',
    'tag': 'Georgia Italic.ttf',
}.items()}
RED, INK, PAPER, WASH, GRAY, RULE = '#BD2926', '#20211F', '#FFFEFD', '#F5F4F0', '#696964', '#DEDED8'


def text(value, x, baseline, size, font='label', color=INK, spacing=0):
    f = fonts[font]
    glyphs, cmap = f.getGlyphSet(), f.getBestCmap()
    unit = size / f['head'].unitsPerEm
    kern = {}
    if 'kern' in f:
        for table in f['kern'].kernTables:
            kern.update(getattr(table, 'kernTable', {}))
    cursor, previous, paths = 0, None, []
    for c in value:
        name = cmap[ord(c)]
        if previous:
            cursor += kern.get((previous, name), 0) * unit
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            paths.append(f'<path transform="translate({x+cursor:.3f} {baseline}) scale({unit:.6f} {-unit:.6f})" d="{d}"/>')
        cursor += f['hmtx'][name][0] * unit + spacing
        previous = name
    return f'<g fill="{color}" aria-label="{escape(value)}">'+''.join(paths)+'</g>', cursor


def icon(x, y, size, color=RED, micro=False):
    # A is transparent negative space, including a restored triangular counter.
    cup = '<path fill-rule="evenodd" d="M12 32H68V53C68 69 56 80 40 80S12 69 12 53Z M26 65L36 41H44L54 65H46L44 59H35L33 65Z M37.6 52H42.4L40 45.5Z"/>'
    handle = '<path d="M67 36H73C94 36 94 63 73 63H65V55H73C83 55 83 44 73 44H67Z"/>'
    steam = '<path d="M33 22L38 10M49 22L54 10" fill="none" stroke="'+color+'" stroke-width="6" stroke-linecap="round"/>'
    saucer = '' if micro else '<path d="M12 88H70" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/>'
    return f'<g transform="translate({x} {y}) scale({size/96})" fill="{color}">{handle}{cup}{steam}{saucer}</g>'


def logo(x, y, width, color=INK, mark=RED, descriptor=True):
    word, tw = text('Abe-spresso', 124, 87, 104, 'brand', color)
    total = 124 + tw
    contents = icon(0, 0, 96, mark) + word
    if descriptor:
        contents += text('DAILY AI BRIEF', 126, 119, 15, 'label', color, 4.5)[0]
    return f'<g transform="translate({x} {y}) scale({width/total})">{contents}</g>'


def svg(width, height, body, title, desc, background=None):
    bg = f'<path fill="{background}" d="M0 0H{width}V{height}H0Z"/>' if background else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>{bg}{body}</svg>'


def save(name, w, h, body, desc, bg=None):
    (ROOT/name).write_text(svg(w,h,body,'Abe-spresso — '+name.removesuffix('.svg'),desc,bg))


def label(value,x,y,size=20,color=GRAY):
    return text(value,x,y,size,'label',color,1.4)[0]


def line(x1,y1,x2,y2,color=RULE):
    return f'<path d="M{x1} {y1}H{x2}" stroke="{color}"/>'

DESC='Abe-spresso: an espresso cup with a transparent A monogram, rising steam and a compact editorial wordmark.'
save('logo-primary.svg',800,208,logo(24,14,752),DESC)
save('logo-horizontal.svg',800,184,logo(24,12,752,descriptor=False),DESC)
save('logo-monochrome.svg',800,208,logo(24,14,752,mark=INK),DESC)
save('logo-reversed.svg',800,208,logo(24,14,752,color=PAPER,mark=PAPER),DESC+' White artwork on a transparent background.')
save('logo-icon.svg',96,96,icon(0,0,96),DESC)
save('logo-icon-mono.svg',96,96,icon(0,0,96,INK),DESC)
save('logo-app-icon.svg',128,128,'<rect width="128" height="128" rx="28" fill="'+RED+'"/>'+icon(16,13,96,PAPER),DESC+' Red application tile.')
favicon = '<rect width="32" height="32" rx="7" fill="'+RED+'"/><path fill="'+PAPER+'" fill-rule="evenodd" d="M6 26L12.5 6H19.5L26 26H19.5L18.2 21H13.8L12.5 26Z M14.5 16.5H17.5L16 11Z"/>'
save('favicon-proposal.svg',32,32,favicon,'Abe-spresso small-scale A monogram. The cup and steam are omitted for clarity at 16–32 pixels.')
stack = icon(182,12,136)+text('Abe-spresso',0,0,104,'brand')[0]
# Center the outlined wordmark precisely using its advance width.
_, width = text('Abe-spresso',0,0,104,'brand')
stack = icon(182,12,136)+text('Abe-spresso',(500-width)/2,240,104,'brand')[0]
_, tw=text('A daily shot of AI.',0,0,24,'tag')
stack+=text('A daily shot of AI.',(500-tw)/2,293,24,'tag',GRAY)[0]
save('logo-stacked.svg',500,330,stack,DESC)

# One editorial proposal sheet: identity first, variants and practical usage below.
b=[]
b+=[label('ABE-SPRESSO / IDENTITY PROPOSAL',80,64,18),label('01 / THE DAILY SHOT',1200,64,18)]
b+=[line(80,92,1520,92)]
b+=[logo(229,164,1130)]
b+=[text('A daily shot of AI.',489,473,37,'tag')[0]]
b+=[line(80,507,1520,507)]
b+=[label('A PERSONAL SIGNATURE. A DAILY RITUAL.',80,552,22,INK),text('Abe + espresso. A little cup with a point of view.',847,552,20,'tag',GRAY)[0]]
# Reversed lockup and small-size family.
b+=['<rect x="80" y="591" width="790" height="330" fill="'+INK+'"/>']
b+=[label('01 / REVERSED',110,631,15,'#B8B8B0'),logo(132,684,669,PAPER,PAPER)]
b+=[label('02 / ICON FAMILY',920,625,16),'<rect x="928" y="680" width="152" height="152" rx="32" fill="'+RED+'"/>',icon(947,693,114,PAPER)]
b+=['<rect x="1150" y="735" width="64" height="64" rx="14" fill="'+RED+'"/>',icon(1156,740,52,PAPER,micro=True),'<g transform="translate(1300 751)">'+favicon+'</g>']
b+=[label('APP / AVATAR',929,878,14),label('64 PX',1151,840,14),label('32 PX',1293,823,14)]
# Rationale, deliberately restrained and easy to scan.
b+=[label('03 / THE IDEA',80,978,16),line(80,998,1520,998)]
for x,n,head,desc1,desc2 in [
 (80,'A','Abe, in the cup.','A transparent A creates a personal','signature inside the espresso cup.'),
 (600,'/','Fresh, every day.','Two rising strokes suggest fresh coffee;','the brief is a daily reading ritual.'),
 (1120,'—','Editorial, not ornamental.','A compact wordmark and a clear baseline','belong to a publication, not a gadget.')]:
 b += [text(n,x,1076,68,'brand',RED)[0],text(head,x+66,1037,24,'label')[0],text(desc1,x+66,1074,16,'label',GRAY)[0],text(desc2,x+66,1098,16,'label',GRAY)[0]]
# Exact website palette, not a separate brown coffee brand.
b += [label('04 / WEBSITE PALETTE',80,1174,16)]
for x,name,c in [(80,'SHOT RED',RED),(455,'INK',INK),(830,'PAPER',PAPER),(1205,'WARM GRAY',WASH)]:
 b += [f'<rect x="{x}" y="1201" width="315" height="48" fill="{c}" stroke="{RULE}"/>',label(name,x,1279,14,INK),text(c,x+220,1279,14,'label',GRAY)[0]]
# Website navigation context; design mockup only.
b += ['<rect x="80" y="1326" width="1440" height="135" fill="'+PAPER+'" stroke="'+RULE+'"/>',logo(110,1350,310),text('A daily shot of AI.',505,1382,23,'tag',GRAY)[0]]
b += [label('TODAY',1110,1403,16,RED),label('ARCHIVE',1231,1403,16,INK),label('SAVED',1383,1403,16,INK)]
b += [label('LOGO CONCEPT / NOT YET APPLIED TO THE WEBSITE',80,1520,14),label('ABE-SPRESSO',1350,1520,14)]
save('logo-design-board.svg',1600,1560,''.join(b),'A complete logo proposal showing the A-monogram espresso cup, wordmark, reversed lockup, icons, palette and website masthead mockup.',PAPER)

# Viewable standalone page. It does not modify the live site's assets.
(ROOT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Abe-spresso · Logo 设计方案</title><style>body{margin:0;background:#f5f4f0;color:#20211f;font-family:system-ui}main{max-width:1400px;margin:auto}img{width:100%;height:auto;display:block}p{margin:0;padding:24px 5%;font-size:14px;line-height:1.8}a{color:#bd2926}</style><main><img src="logo-design-board.svg" alt="Abe-spresso Logo 设计方案：负形 A 浓缩咖啡杯、紧凑字标、反白版、应用图标和网站刊头预览"><p>独立设计提案，尚未替换网站现有 Logo。<a href="logo-primary.svg" download>主 Logo SVG</a> · <a href="logo-primary.png" download>透明底 PNG</a> · <a href="README.md">设计与使用说明</a></p></main></html>''')
print('Generated SVG logo system and presentation.')
