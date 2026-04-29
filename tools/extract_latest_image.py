"""Pull the most recent inline image attachment out of the Claude Code
session jsonl and write it to public/icons/ui/dashboard-mockup-new.png
(or .jpg, depending on the mime type detected)."""
import json
import base64
import sys
from pathlib import Path

LOG = Path.home() / '.claude' / 'projects' / 'C--Users-jhahn-Desktop-GameDev' / '029a6640-1ac9-443b-8b54-70cf8ad7e86d.jsonl'
OUT_DIR = Path('public/icons/ui')

def walk(node):
    """Yield every dict in the tree."""
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)

def main():
    if not LOG.exists():
        print(f'No log at {LOG}', file=sys.stderr)
        sys.exit(1)
    images = []
    with open(LOG, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                obj = json.loads(line)
            except Exception:
                continue
            for d in walk(obj):
                if d.get('type') == 'image' and isinstance(d.get('source'), dict):
                    src = d['source']
                    if src.get('type') == 'base64' and src.get('data'):
                        images.append((src.get('media_type', 'image/png'), src['data']))
    print(f'Found {len(images)} image(s) in session log.')
    if not images:
        sys.exit(1)
    # The most recent (last) image is what the user just attached.
    media, b64 = images[-1]
    ext = '.png' if 'png' in media else '.jpg' if 'jp' in media else '.bin'
    out = OUT_DIR / f'dashboard-mockup-new{ext}'
    out.write_bytes(base64.b64decode(b64))
    print(f'Wrote {out} ({out.stat().st_size} bytes, type={media})')

if __name__ == '__main__':
    main()
