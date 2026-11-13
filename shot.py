import sys, time
from playwright.sync_api import sync_playwright
html, out, q = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv)>3 else "")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width":960,"height":540})
    logs=[]
    pg.on("console", lambda m: logs.append(m.type+": "+m.text[:200]))
    pg.on("pageerror", lambda e: logs.append("PAGEERROR: "+str(e)[:300]))
    pg.goto("file://"+html+"?"+q)
    t0=time.time()
    try:
        pg.wait_for_function("document.getElementById('boot') && document.getElementById('boot').hidden", timeout=150000)
        print("booted in %.1fs"%(time.time()-t0))
    except Exception as e:
        print("boot timeout; msg:", pg.evaluate("document.getElementById('boot-msg')?.textContent"))
    pg.wait_for_timeout(4000)
    pg.screenshot(path=out)
    print("fatal:", pg.evaluate("window.__fatal"), "| errors:", pg.evaluate("(window.__errors||[]).slice(0,5)"))
    for l in logs[:12]: print(l)
    b.close()
