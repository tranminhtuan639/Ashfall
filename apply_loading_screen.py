"""Install the Ashfall loading screen into an existing source checkout."""

import argparse
import base64
from pathlib import Path
import re

CSS = """
/* Ashfall loading screen */
#boot.ashfall-boot {
  justify-content: flex-end;
  padding-bottom: max(36px, 8vh, env(safe-area-inset-bottom, 0px));
  background: #170e0b;
  isolation: isolate;
}
.ashfall-boot .boot-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  z-index: -2;
  color: var(--bone);
  font-family: var(--f-display);
  font-size: clamp(34px, 8vw, 96px);
  text-align: center;
}
#boot.ashfall-boot::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(9, 6, 5, .96), transparent 46%);
  z-index: -1;
}
.ashfall-boot .boot-sub { color: #fff1dc; text-shadow: 0 1px 5px #000; }
.ashfall-boot .boot-bar { width: min(400px, 72vw); height: 3px; background: rgba(255, 239, 218, .28); }
.ashfall-boot .boot-bar i { background: #ffad55; }
@media (max-aspect-ratio: 1/1) {
  .ashfall-boot .boot-art { object-fit: contain; object-position: center; }
}
"""
BOOT = re.compile(r'<div\b(?=[^>]*\bid=["\']boot["\'])[^>]*>')
MARK = re.compile(r'<div\b[^>]*\bclass=["\']boot-mark["\'][^>]*>\s*'
                  r'(?:Saltline|Ashfall)\s*</div>', re.IGNORECASE)
ART = re.compile(r'<img\b[^>]*\bclass=["\']boot-art["\'][^>]*>')


def install(project):
    template_path = project / "index.template.html"
    css_path = project / "css" / "ui.css"
    template = template_path.read_bytes().decode("utf-8")
    css = css_path.read_bytes().decode("utf-8")
    header = BOOT.search(template)
    if header is None:
        raise ValueError('Could not find the loader container with id="boot".')
    mark = ART.match(template, header.end()) or re.compile(
        r'\s*(?:' + ART.pattern + r'|' + MARK.pattern + r')',
        re.IGNORECASE,
    ).match(template, header.end())
    if mark is None or not all(f'id="{key}"' in template for key in ("boot-msg", "boot-fill")):
        raise ValueError("The loading-screen markup differs from the supported template.")

    image = Path(__file__).with_name("ashfall-loading.jpg").read_bytes()
    encoded = base64.b64encode(image).decode("ascii")
    art = f'<img class="boot-art" src="data:image/jpeg;base64,{encoded}" alt="ASHFALL">'
    newline = "\r\n" if "\r\n" in template else "\n"
    tag = header.group()
    class_attr = re.search(r'\bclass=(["\'])(.*?)\1', tag)
    if class_attr is None:
        tag = tag[:-1] + ' class="ashfall-boot">'
    elif "ashfall-boot" not in class_attr[2].split():
        tag = tag[:class_attr.end(2)] + " ashfall-boot" + tag[class_attr.end(2):]

    updated = template[:header.start()] + tag + newline + "    " + art + template[mark.end():]
    updated = re.sub(r"<title>[^<]*</title>", "<title>Ashfall</title>", updated, count=1)
    updated = re.sub(r'(<div\b[^>]*\bid="boot-msg"[^>]*>)[^<]*(</div>)',
                     r"\g<1>Loading Ashfall\2", updated, count=1)

    if "/* Ashfall loading screen */" not in css:
        css_newline = "\r\n" if "\r\n" in css else "\n"
        updated_css = css.rstrip() + css_newline * 2 + CSS.lstrip().replace("\n", css_newline)
        css_path.write_bytes(updated_css.encode("utf-8"))
    if updated != template:
        template_path.write_bytes(updated.encode("utf-8"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, nargs="?", default=Path.cwd())
    args = parser.parse_args()
    try:
        install(args.project)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Ashfall loader: {error}\n")
    print("Ashfall loader installed. Build with: python build.py dist/index.html")
