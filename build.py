#!/usr/bin/env python3
"""
Simple zero-dependency bundler for Spear-Mace PVP.
Combines js/*.js modules into:
1. bundle.js (for use with modular index.html)
2. spear-mace-pvp.html (100% self-contained, standalone single-file HTML for download and offline play)
"""

import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
CSS_FILE = os.path.join(BASE_DIR, "css", "style.css")
INDEX_FILE = os.path.join(BASE_DIR, "index.html")
BUNDLE_FILE = os.path.join(BASE_DIR, "bundle.js")
STANDALONE_HTML = os.path.join(BASE_DIR, "spear-mace-pvp.html")

FILES_IN_ORDER = [
    "config.js",
    "pixel.js",
    "audio.js",
    "weapons.js",
    "arena.js",
    "auth.js",
    "particles.js",
    "entity.js",
    "ai.js",
    "combat.js",
    "renderer.js",
    "game.js",
    "ui.js",
    "main.js"
]

def bundle():
    combined = ["(function() {", "  'use strict';", ""]
    
    for filename in FILES_IN_ORDER:
        filepath = os.path.join(JS_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Remove import lines
        content = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?\n?', '', content)
        
        # Remove export default
        content = re.sub(r'export\s+default\s+', '', content)
        
        # Remove export keyword before const/let/var/function/class
        content = re.sub(r'export\s+(const|let|var|function|class)\s+', r'\1 ', content)
        
        # Remove export { ... };
        content = re.sub(r'export\s*\{[^}]*\};?\n?', '', content)
        
        combined.append(f"  // ===== {filename} =====")
        for line in content.split("\n"):
            combined.append(f"  {line}")
        combined.append("")
    
    combined.append("})();")
    js_code = "\n".join(combined)
    
    with open(BUNDLE_FILE, "w", encoding="utf-8") as f:
        f.write(js_code)
    
    print(f"Bundled {len(FILES_IN_ORDER)} JS files into {BUNDLE_FILE} ({len(js_code.encode('utf-8'))} bytes)")

    # Generate standalone spear-mace-pvp.html
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        html = f.read()
    with open(CSS_FILE, "r", encoding="utf-8") as f:
        css = f.read()

    # Inline CSS
    css_inlined = f"<style>\n{css}\n</style>"
    html = re.sub(r'<link\s+rel=[\'"]stylesheet[\'"]\s+href=[\'"]css/style\.css[\'"]\s*/?>', css_inlined, html)

    # Inline JS bundle
    js_inlined = f"<script>\n{js_code}\n</script>"
    html = re.sub(r'<script\s+src=[\'"]bundle\.js[\'"]\s*></script>', js_inlined, html)

    with open(STANDALONE_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    standalone_size = len(html.encode("utf-8"))
    print(f"Generated standalone downloadable HTML: {STANDALONE_HTML} ({standalone_size} bytes)")

if __name__ == "__main__":
    bundle()
