"""Optional online source check (Python 3 standard library).
Does not rewrite the verified ledger or infer new publication dates.
Run: python3 tests/verify-news-sources.py
"""
import concurrent.futures
import datetime
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import urllib.request

class SourceText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('p', 'h1', 'h2', 'div', 'time'):
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def verify(source):
    result = {'id': source['id'], 'url': source['url']}
    try:
        request = urllib.request.Request(source['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=40) as response:
            result.update(status=response.status, finalURL=response.url)
            parser = SourceText()
            parser.feed(response.read().decode('utf-8'))
        text = re.sub(r'\s+', ' ', ''.join(parser.parts))
        result.update(titleFound=source['title'] in text, excerptFound=source['excerpt'] in text)
        result['passed'] = result['status'] == 200 and result['titleFound'] and result['excerptFound']
    except Exception as error:
        result.update(passed=False, error=str(error))
    return result


if __name__ == '__main__':
    sources = json.loads((Path(__file__).resolve().parent.parent / 'design/news-sources.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(verify, sources))
    print(json.dumps({'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'passed': sum(r['passed'] for r in results), 'results': results}, indent=2))
    sys.exit(0 if all(r['passed'] for r in results) else 1)
