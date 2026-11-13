#!/usr/bin/env python3
"""Ghép css/ + js/ + data/ lại thành 1 file HTML duy nhất.

    python3 build.py            -> dist/saltline-stadium.html
    python3 build.py out.html   -> file tuỳ chọn

Các file trong js/ là các MẢNH của cùng một IIFE (chung scope, tên biến đã bị
minify), nên phải ghép đúng thứ tự tên file (00, 10, 20 ...). Không import/export.
"""
import sys, pathlib

root = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist" / "saltline-stadium.html"

read = lambda p: (root / p).read_text(encoding="utf-8")

js = "".join(p.read_text(encoding="utf-8") for p in sorted((root / "js").glob("*.js")))

# chèn data lớn (JSON) vào chỗ marker /*@inline:path*/ null
while "/*@inline:" in js:
    a = js.index("/*@inline:")
    b = js.index("*/", a)
    path = js[a + len("/*@inline:"):b]
    end = b + 2 + len(" null")
    assert js[b + 2:end] == " null", "marker phải có dạng /*@inline:path*/ null"
    js = js[:a] + read(path) + js[end:]

html = read("index.template.html").replace("{{CSS}}", read("css/ui.css")).replace("{{JS}}", js)

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8", newline="")
print(f"OK -> {out}  ({out.stat().st_size:,} bytes)")
