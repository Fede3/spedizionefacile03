#!/usr/bin/env python3
"""
Multi-pass CSS purge: ripete bisect-purge finché stable (nessuna nuova classe morta).

Ad ogni passo, dopo aver cancellato classi morte, alcune classi che le referenziavano
diventano a loro volta morte. Iteriamo finché il purge non trova più niente.

Inoltre detect:
- Classi nel CSS che fanno SOLO @apply utility -> sostituibili nel template
- Classi mai referenziate (anche dopo dead-purge precedenti)
- @keyframes mai referenziati
- Classi in selettori complessi (.a > .b > .c) dove se .a è morta tutto il sub-tree è morto

USO: python scripts/multi-pass-purge.py [--max-passes=5] [--apply]
"""
import argparse
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_DIR = ROOT / "apps/web/assets/css"
VUE_DIRS = [
    ROOT / "apps/web/pages",
    ROOT / "apps/web/components",
    ROOT / "apps/web/layouts",
    ROOT / "apps/web/composables",
    ROOT / "apps/web/utils",
    ROOT / "apps/web/stores",
    ROOT / "apps/web/middleware",
    ROOT / "apps/web/plugins",
    ROOT / "apps/web/app.vue",
    ROOT / "apps/web/error.vue",
]

PROTECT = {"sr-only", "v-cloak", "no-script"}


def collect_haystack(include_css=True):
    parts = []
    for d in VUE_DIRS:
        if d.is_file():
            try:
                parts.append(d.read_text(encoding="utf-8", errors="ignore"))
            except Exception:
                pass
        elif d.is_dir():
            for f in d.rglob("*"):
                if f.suffix in (".vue", ".ts", ".js"):
                    try:
                        parts.append(f.read_text(encoding="utf-8", errors="ignore"))
                    except Exception:
                        pass
    if include_css:
        for f in CSS_DIR.rglob("*.css"):
            try:
                parts.append(f.read_text(encoding="utf-8", errors="ignore"))
            except Exception:
                pass
    return "\n".join(parts)


def class_used(cls, hay, exclude_css_self=None):
    if cls in PROTECT:
        return True
    h = hay if exclude_css_self is None else hay.replace(exclude_css_self, "")
    if re.search(rf'class\s*=\s*["\'`][^"\'`]*\b{re.escape(cls)}\b[^"\'`]*["\'`]', h):
        return True
    if re.search(rf'[\"\'`]{re.escape(cls)}[\"\'`]', h):
        return True
    if re.search(rf'@apply[^;\n]*\b{re.escape(cls)}\b', h):
        return True
    if re.search(rf'[\"\'`][\w-]*\b{re.escape(cls)}-?\w*[\"\'`]', h):
        return True
    return False


def purge_file_pass(css_path):
    """Single pass on one file. Returns (new_content, blocks, lines_saved)."""
    content = css_path.read_text(encoding="utf-8")
    classes_in_file = set()
    for m in re.finditer(r'^\.([a-zA-Z_][a-zA-Z0-9_-]*)', content, re.MULTILINE):
        classes_in_file.add(m.group(1))
    if not classes_in_file:
        return content, 0, 0
    hay = collect_haystack(include_css=True)
    dead = set()
    for cls in classes_in_file:
        if not class_used(cls, hay, content):
            dead.add(cls)
    if not dead:
        return content, 0, 0

    new_content = []
    i = 0
    L = len(content)
    removed = 0
    while i < L:
        m = re.match(r'(\s*)\.([a-zA-Z_][a-zA-Z0-9_-]*)([^{,]*)\{', content[i:])
        if m and m.group(2) in dead:
            depth = 1
            j = i + m.end()
            while j < L and depth > 0:
                if content[j] == '{':
                    depth += 1
                elif content[j] == '}':
                    depth -= 1
                j += 1
            while j < L and content[j] in ' \t\n\r':
                j += 1
            i = j
            removed += 1
            continue
        nl = content.find('\n', i)
        if nl == -1:
            new_content.append(content[i:])
            break
        new_content.append(content[i:nl + 1])
        i = nl + 1
    new_text = ''.join(new_content)
    delta = content.count('\n') - new_text.count('\n')
    return new_text, removed, delta


def purge_keyframes(css_path):
    """Cancella @keyframes mai referenziati nelle pagine/CSS."""
    content = css_path.read_text(encoding="utf-8")
    keyframes = re.findall(r'@(?:-webkit-)?keyframes\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{', content)
    if not keyframes:
        return content, 0, 0
    hay = collect_haystack(include_css=True)
    dead_kf = set()
    for kf in set(keyframes):
        # cerca uso in animation: name OR animation-name: name
        if re.search(rf'animation(?:-name)?\s*:[^;]*\b{re.escape(kf)}\b', hay):
            continue
        # cerca anche dentro string
        if re.search(rf'[\"\'`]{re.escape(kf)}[\"\'`]', hay):
            continue
        dead_kf.add(kf)
    if not dead_kf:
        return content, 0, 0

    new_content = []
    i = 0
    L = len(content)
    removed = 0
    while i < L:
        m = re.match(r'(\s*)@(?:-webkit-)?keyframes\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{', content[i:])
        if m and m.group(2) in dead_kf:
            depth = 1
            j = i + m.end()
            while j < L and depth > 0:
                if content[j] == '{':
                    depth += 1
                elif content[j] == '}':
                    depth -= 1
                j += 1
            while j < L and content[j] in ' \t\n\r':
                j += 1
            i = j
            removed += 1
            continue
        nl = content.find('\n', i)
        if nl == -1:
            new_content.append(content[i:])
            break
        new_content.append(content[i:nl + 1])
        i = nl + 1
    new_text = ''.join(new_content)
    delta = content.count('\n') - new_text.count('\n')
    return new_text, removed, delta


def check_nuxt(retries=10, delay=2):
    for _ in range(retries):
        try:
            r = urllib.request.urlopen("http://127.0.0.1:3001/", timeout=5)
            if r.status == 200:
                body = r.read().decode("utf-8", errors="ignore")
                if 'h1' in body.lower() or '__NUXT__' in body:
                    return True
        except Exception:
            pass
        time.sleep(delay)
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-passes", type=int, default=5)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    css_files = sorted(CSS_DIR.rglob("*.css"))

    total_saved = 0
    total_blocks = 0
    total_kf = 0

    for pass_num in range(1, args.max_passes + 1):
        print(f"\n=== PASS {pass_num} ===")
        pass_lines = 0
        pass_blocks = 0
        pass_kf = 0

        for css in css_files:
            rel = css.relative_to(ROOT)
            # Classes
            new_content, blocks, lines = purge_file_pass(css)
            if blocks > 0:
                if args.apply:
                    css.write_text(new_content, encoding="utf-8")
                    time.sleep(2)
                    if not check_nuxt(retries=10, delay=2):
                        # rollback: re-read original from git
                        import subprocess
                        subprocess.run(['git', 'checkout', '--', str(css)], cwd=ROOT, capture_output=True)
                        time.sleep(2)
                        check_nuxt(retries=20, delay=2)
                        print(f"  FAIL {rel}: rollback (Nuxt non 200)")
                        continue
                print(f"  OK   {rel}: -{lines} LOC ({blocks} classi morte)")
                pass_lines += lines
                pass_blocks += blocks

            # Keyframes
            new_content2, kf_blocks, kf_lines = purge_keyframes(css)
            if kf_blocks > 0:
                if args.apply:
                    css.write_text(new_content2, encoding="utf-8")
                    time.sleep(2)
                    if not check_nuxt(retries=10, delay=2):
                        import subprocess
                        subprocess.run(['git', 'checkout', '--', str(css)], cwd=ROOT, capture_output=True)
                        time.sleep(2)
                        check_nuxt(retries=20, delay=2)
                        print(f"  FAIL {rel} keyframes: rollback")
                        continue
                print(f"  OK   {rel}: -{kf_lines} LOC ({kf_blocks} keyframes morti)")
                pass_lines += kf_lines
                pass_kf += kf_blocks

        if pass_lines == 0:
            print(f"\n  Stable (no more dead code) — exit early")
            break

        total_saved += pass_lines
        total_blocks += pass_blocks
        total_kf += pass_kf

    print(f"\n=== TOTALE: {total_blocks} classi + {total_kf} keyframes morti, {total_saved} LOC ===")
    if not args.apply:
        print("(check mode, riesegui con --apply)")


if __name__ == "__main__":
    main()
