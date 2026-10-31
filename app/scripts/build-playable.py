"""Pack the web export into one self-contained HTML page that can be played
from a link (a claude.ai artifact, a file, any static host).

    EXPO_OFFLINE=1 npx expo export -p web --output-dir dist-web
    python3 scripts/build-playable.py dist-web blockhaus.html

Inlines the JS bundle and turns the fonts and sounds the app uses into data
URIs. The page may run in a sandboxed frame where the URL path is not ours,
so a small shim pins the router to "/" before the bundle starts.
"""
import base64
import mimetypes
import os
import re
import sys

src, out = sys.argv[1], sys.argv[2]
html = open(os.path.join(src, 'index.html'), encoding='utf8').read()

USED = ('sounds/', 'DelaGothicOne_400Regular', 'Onest_400Regular', 'Onest_500Medium', 'Onest_600SemiBold')


def inline_assets(js: str) -> str:
    def sub(m):
        path = m.group(1)
        if not any(u in path for u in USED):
            return m.group(0)
        f = os.path.join(src, path.lstrip('/'))
        if not os.path.exists(f):
            return m.group(0)
        mime = mimetypes.guess_type(f)[0] or ('font/ttf' if f.endswith('.ttf') else 'application/octet-stream')
        return '"data:%s;base64,%s"' % (mime, base64.b64encode(open(f, 'rb').read()).decode())

    return re.sub(r'"(/assets/[^"]+)"', sub, js)


SHIM = """<script>
/* Pin the router to "/" whatever the frame's URL is, and keep navigation in
   memory if the frame refuses history changes. */
(function () {
  var stack = [{ state: null, url: '/' }];
  try { history.replaceState(null, '', '/'); return; } catch (e) {}
  var path = '/';
  try {
    Object.defineProperty(History.prototype, 'state', { get: function () { return stack[stack.length - 1].state; } });
    History.prototype.pushState = function (s, t, u) { stack.push({ state: s, url: u || path }); path = String(u || path); };
    History.prototype.replaceState = function (s, t, u) { stack[stack.length - 1] = { state: s, url: u || path }; path = String(u || path); };
  } catch (e) {}
})();
</script>"""


def script(m):
    f = os.path.join(src, m.group(1).lstrip('/'))
    js = inline_assets(open(f, encoding='utf8').read()).replace('</script', '<\\/script')
    return '<script>' + js + '</script>'


html = re.sub(r'<script src="([^"]+)" defer></script>', script, html)
html = html.replace('<link rel="icon" href="/favicon.ico"/>', '')
html = html.replace('<div id="root"></div>', '<div id="root"></div>' + SHIM, 1)
# The bundle must run after #root exists: the deferred scripts are now inline
# in <body> after it, which keeps that order.
open(out, 'w', encoding='utf8').write(html)
print(out, len(html) // 1024, 'KB')
