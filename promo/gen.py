#!/usr/bin/env python3
"""Writes the 30 s and 15 s Bulwark promo projects (cut30/, cut15/).
Edit the CUTS table and rerun: python3 gen.py. Output is plain HyperFrames HTML."""
import os, json

ROOT = os.path.dirname(os.path.abspath(__file__))
MARK_INK = '<path fill="#0B0D10" d="M3 29V3h5v4h4V3h8v4h4V3h5v26z"/>'
BOLT_VOLT = '<path fill="#F5C518" d="M18 9l-7 10h5l-2 7 7-10h-5z"/>'

FINDINGS = [
    ("critical", "ot.modbus-bind-all", "grid-ot", "plant/hmi/server.py:142", "Modbus listener bound to all interfaces"),
    ("critical", "ot.default-credentials", "grid-ot", "hmi/config.yaml:7", "Default credential in HMI, PLC or SCADA config"),
    ("high", "ot.ocpp-ws-plain", "grid-ot", "charge/ws.js:88", "Plain ws:// WebSocket (OCPP and SCADA links must use wss://)"),
    ("high", "tls.verify-disabled", "secrets-core", "hist/client.py:40", "TLS verification disabled"),
    ("medium", "ot.dnp3-no-sa", "grid-ot", "rtu/master.c:211", "DNP3 endpoint; confirm Secure Authentication v5 or v6 is enabled"),
]
REPO = "springfield-water/scada-hmi"
EDGE_CMD = "node bulwark-runner.mjs scan /srv/git/scada-hmi --offline"

CUTS = {
    "cut30": dict(
        total=30.0,
        montage=dict(start=0, dur=12.5,
            shots=[("pearl1882", 0, 1.0), ("tubes1882", 1.0, .5), ("switch1910", 1.5, .5), ("realines", 2.0, .5),
                   ("rea", 2.5, .5), ("damyard", 3.0, .5), ("tower", 3.5, .5), ("wilsongen1942", 4.0, .5),
                   ("stator1942", 4.5, .5), ("switchyard1942", 5.0, .5), ("staten1973", 5.5, .5),
                   ("fourcorners", 6.0, .5), ("director", 6.5, .5), ("coulee", 7.0, .5),
                   ("before2003", 7.5, 1.0), ("after2003", 8.5, 4.0)],
            years=[("1882", 0, 1.5), ("1910", 1.5, .5), ("1942", 4.0, 1.5), ("1973", 5.5, .5), ("2003", 7.5, 5.0)],
            lines=[("We built the grid", 0.5, 3.5), ("Then we put it online", 5.5, 2.0),
                   ("50 million people lose power", 8.6, 1.9), ("A software bug silenced the alarms", 10.5, 2.0)]),
        question=dict(start=12.5, dur=2.0),
        product=dict(start=14.5, dur=10.5, scan=True, edge=True),
        endcard=dict(start=25.0, dur=5.0),
    ),
    "cut15": dict(
        total=15.0,
        montage=dict(start=0, dur=6.0,
            shots=[("pearl1882", 0, .5), ("tubes1882", .5, .25), ("switch1910", .75, .25), ("realines", 1.0, .25),
                   ("rea", 1.25, .25), ("tower", 1.5, .25), ("wilsongen1942", 1.75, .25), ("stator1942", 2.0, .25),
                   ("switchyard1942", 2.25, .25), ("staten1973", 2.5, .25), ("director", 2.75, .25),
                   ("coulee", 3.0, .25), ("before2003", 3.25, .5), ("after2003", 3.75, 2.25)],
            years=[("1882", 0, .75), ("1942", 1.75, .75), ("2003", 3.25, 2.75)],
            lines=[("We built the grid", 0.25, 3.0), ("50 million people lose power", 3.85, 2.15)]),
        question=dict(start=6.0, dur=1.75),
        product=dict(start=7.75, dur=3.75, scan=False, edge=False),
        endcard=dict(start=11.5, dur=3.5),
    ),
}

BASE_CSS = """
    #root { position:absolute; inset:0; overflow:hidden; background:#0B0D10; color:#E8EAED;
      font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif; }
    #root * { box-sizing:border-box; }
"""


def words(text, cls="w"):
    return " ".join(f'<span class="{cls}">{w}</span>' for w in text.split())


def montage(c):
    m = c["montage"]
    shots = "\n".join(
        f'    <div id="m-shot-{i:02d}" class="clip m-shot" data-start="{s}" data-duration="{d}" data-track-index="0" data-layout-ignore>'
        f'<img src="assets/archive/{n}.jpg" alt=""></div>'
        for i, (n, s, d) in enumerate(m["shots"]))
    years = "\n".join(
        f'    <div id="m-year-{y}" class="clip m-year" data-start="{s}" data-duration="{d}" data-track-index="2">{y}</div>'
        for y, s, d in m["years"])
    lines = "\n".join(
        f'    <div id="m-line-{i}" class="clip m-line" data-start="{s}" data-duration="{d}" data-track-index="3">{words(t)}</div>'
        for i, (t, s, d) in enumerate(m["lines"]))
    zoom = "\n".join(
        f'    tl.fromTo("#m-shot-{i:02d} img", {{scale:1.03}}, {{scale:{1.03 + min(.08, d * .03):.3f}, duration:{d}, ease:"none"}}, {s});'
        for i, (n, s, d) in enumerate(m["shots"]))
    lin = "\n".join(
        f'    tl.fromTo("#m-line-{i} .w", {{opacity:0, filter:"blur(6px)"}}, {{opacity:1, filter:"blur(0px)", duration:0.13, stagger:0.067, ease:"power2.out"}}, {s});'
        for i, (t, s, d) in enumerate(m["lines"]))
    return f"""<template>
  <style>{BASE_CSS}
    .m-shot {{ position:absolute; inset:0; overflow:hidden; z-index:1; }}
    .m-shot img {{ position:absolute; left:0; top:0; width:1920px; height:1080px; object-fit:cover; }}
    #m-scrim {{ position:absolute; inset:0; z-index:2;
      background:linear-gradient(180deg, rgba(11,13,16,.55) 0%, rgba(11,13,16,0) 34%, rgba(11,13,16,0) 48%, rgba(11,13,16,.88) 100%); }}
    .m-year {{ position:absolute; left:96px; top:54px; z-index:3; font-weight:900; font-size:270px; line-height:1;
      letter-spacing:-.04em; color:#F5C518; font-variant-numeric:tabular-nums; }}
    .m-line {{ position:absolute; left:96px; right:96px; bottom:84px; z-index:4; font-weight:900; font-size:150px;
      line-height:.95; letter-spacing:-.025em; text-transform:uppercase; color:#E8EAED; }}
  </style>
  <div id="root" data-composition-id="montage" data-width="1920" data-height="1080">
{shots}
    <div id="m-scrim" data-layout-ignore></div>
{years}
{lines}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{zoom}
{lin}
    window.__timelines["montage"] = tl;
  </script>
</template>
"""


def question(c):
    d = c["question"]["dur"]
    return f"""<template>
  <style>{BASE_CSS}
    #q-grid {{ position:absolute; inset:0;
      background-image:linear-gradient(#262B33 1px,transparent 1px),linear-gradient(90deg,#262B33 1px,transparent 1px);
      background-size:96px 96px; background-position:-1px -1px; }}
    #q-shade {{ position:absolute; inset:0; background:radial-gradient(ellipse at 70% 30%,rgba(11,13,16,.55),rgba(11,13,16,.93) 70%); }}
    #q-line {{ position:absolute; left:96px; top:250px; font-weight:900; font-size:270px; line-height:.92;
      letter-spacing:-.03em; text-transform:uppercase; }}
    #q-line .volt {{ color:#F5C518; }}
  </style>
  <div id="root" data-composition-id="question" data-width="1920" data-height="1080">
    <div id="q-grid" data-layout-ignore></div>
    <div id="q-shade" data-layout-ignore></div>
    <div id="q-line" class="clip" data-start="0" data-duration="{d}" data-track-index="1"><div id="q-inner"><span class="w">Who</span> <span class="w">checks</span><br><span class="w">the</span> <span class="w volt">code?</span></div></div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#q-line .w", {{opacity:0, filter:"blur(10px)"}}, {{opacity:1, filter:"blur(0px)", duration:0.16, stagger:0.09, ease:"power2.out"}}, 0.05);
    tl.fromTo("#q-inner", {{opacity:1, filter:"blur(0px)", scale:1}}, {{opacity:0, filter:"blur(14px)", scale:1.06, duration:0.2, ease:"power3.in"}}, {d - 0.2});
    window.__timelines["question"] = tl;
  </script>
</template>
"""


def product(c):
    p = c["product"]; D = p["dur"]; scan = p["scan"]; edge = p["edge"]
    t_find = 2.5 if scan else 0.0            # findings pane start
    t_edge = D - 3.5 if edge else D          # edge pane start
    find_dur = t_edge - t_find
    row_gap = 0.35 if scan else 0.22
    row0 = t_find + (0.45 if scan else 0.4)
    t_head = row0 + row_gap * len(FINDINGS) + 0.25
    rows = "\n".join(
        f'''          <tr id="p-row-{i}"><td class="sev-{sev}">{sev}<br><span class="tag">grid</span></td>'''
        f'''<td class="mono">{rule}<br><small>{det}</small></td><td class="mono">{REPO.split("/")[1]}<br>{loc}</td>'''
        f'''<td>{msg}</td><td><span class="sel">open</span></td></tr>'''
        for i, (sev, rule, det, loc, msg) in enumerate(FINDINGS))
    gh_pane = f"""
    <div id="p-github" class="clip p-pane" data-start="0" data-duration="{t_find}" data-track-index="2">
      <h2>Repositories</h2>
      <table><tr><th>Repository</th><th></th></tr>
        <tr><td class="mono">{REPO}</td><td class="act"><span id="p-scan" class="btn small"><span id="p-scan-a">Scan now</span><span id="p-scan-b">Scanning…</span></span> <span class="btn ghost small">Remove</span></td></tr>
      </table>
    </div>
    <svg id="p-cursor" class="clip" data-start="0" data-duration="{t_find}" data-track-index="5" data-layout-ignore viewBox="0 0 24 24" width="96" height="96"><path id="p-cursor-shape" d="M4 2l15 9-6.5 1.6L9.2 19z" fill="#E8EAED" stroke="#0B0D10" stroke-width="1.4" stroke-linejoin="round"/></svg>""" if scan else ""
    edge_pane = f"""
    <div id="p-edge" class="clip p-pane" data-start="{t_edge}" data-duration="{D - t_edge}" data-track-index="2">
      <div id="p-edge-in">
        <div class="kicker">Bulwark Edge</div>
        <h1>Bulwark Edge for plant networks</h1>
        <pre id="p-cmd">{"".join(f'<span class="ch">{ch}</span>' for ch in EDGE_CMD)}</pre>
        <p class="lead">Source code never has to leave the plant.</p>
      </div>
    </div>""" if edge else ""
    tabs_dur = t_edge
    js = []
    if scan:
        js.append('tl.fromTo("#p-shell", {scale:1.05, opacity:0, filter:"blur(10px)"}, {scale:1, opacity:1, filter:"blur(0px)", duration:0.5, ease:"expo.out"}, 0);')
        js.append('tl.fromTo("#p-cursor", {x:1980, y:1100}, {x:1440, y:620, duration:0.75, ease:"power3.out"}, 0.35);')
        js.append('tl.fromTo("#p-cursor-shape", {scale:1, transformOrigin:"4px 2px"}, {scale:0.8, duration:0.07, yoyo:true, repeat:1, ease:"power2.out"}, 1.2);')
        js.append('tl.set("#p-scan-a", {opacity:0}, 1.27); tl.set("#p-scan-b", {opacity:1}, 1.27); tl.set("#p-scan", {opacity:0.5}, 1.27);')
        js.append('tl.set("#p-tab-github", {color:"#8A919C", borderBottomColor:"rgba(0,0,0,0)"}, %s); tl.set("#p-tab-findings", {color:"#E8EAED", borderBottomColor:"#F5C518"}, %s);' % (t_find, t_find))
    else:
        js.append('tl.fromTo("#p-shell", {scale:1.05, opacity:0, filter:"blur(10px)"}, {scale:1, opacity:1, filter:"blur(0px)", duration:0.4, ease:"expo.out"}, 0);')
    js.append(f'tl.fromTo("#p-findings tr.r", {{opacity:0}}, {{opacity:1, duration:0.12, stagger:{row_gap}, ease:"power2.out"}}, {row0});')
    js.append(f'tl.fromTo("#p-findings .tag", {{opacity:0, scale:1.6}}, {{opacity:1, scale:1, duration:0.18, stagger:0.06, ease:"back.out(1.4)"}}, {t_head - 0.1});')
    js.append(f'tl.fromTo("#p-head .w", {{opacity:0, filter:"blur(8px)"}}, {{opacity:1, filter:"blur(0px)", duration:0.14, stagger:0.08, ease:"power2.out"}}, {t_head});')
    if edge:
        js.append(f'tl.fromTo("#p-edge-in", {{opacity:0, x:60, filter:"blur(12px)"}}, {{opacity:1, x:0, filter:"blur(0px)", duration:0.3, ease:"power4.out"}}, {t_edge});')
        js.append(f'tl.fromTo("#p-cmd .ch", {{opacity:0}}, {{opacity:1, duration:0.01, stagger:0.022, ease:"none"}}, {t_edge + 0.35});')
        js.append(f'tl.fromTo("#p-edge .lead", {{opacity:0, filter:"blur(6px)"}}, {{opacity:1, filter:"blur(0px)", duration:0.2, ease:"power2.out"}}, {t_edge + 1.15});')
    gh_on = "on" if scan else ""; fi_on = "" if scan else "on"
    return f"""<template>
  <style>{BASE_CSS}
    #p-shell {{ position:absolute; inset:0; padding:0 80px; }}
    #p-nav {{ display:flex; justify-content:space-between; align-items:center; height:124px; }}
    .logo {{ display:flex; gap:18px; align-items:center; font:700 28px "JetBrains Mono",Menlo,monospace; letter-spacing:.2em; color:#E8EAED; }}
    .logo img {{ width:52px; height:52px; }}
    #p-who {{ font:400 28px "JetBrains Mono",Menlo,monospace; color:#E8EAED; }}
    #p-tabs {{ position:absolute; left:80px; right:80px; top:124px; display:flex; gap:8px; border-bottom:2px solid #262B33; }}
    #p-tabs span {{ color:#8A919C; padding:18px 26px; font-size:28px; border-bottom:4px solid rgba(0,0,0,0); margin-bottom:-2px; white-space:nowrap; }}
    #p-tabs span.on {{ color:#E8EAED; border-bottom-color:#F5C518; }}
    .p-pane {{ position:absolute; left:80px; right:80px; top:226px; }}
    .p-pane h2 {{ font-size:46px; font-weight:700; letter-spacing:-.01em; margin:18px 0 20px; }}
    table {{ width:100%; border-collapse:collapse; font-size:28px; line-height:1.34; }}
    th, td {{ text-align:left; padding:13px 12px; border-bottom:2px solid #262B33; vertical-align:top; }}
    th {{ color:#8A919C; font-weight:700; }}
    td.act {{ text-align:right; }}
    .mono {{ font-family:"JetBrains Mono",Menlo,monospace; font-size:28px; }}
    small {{ font-size:28px; color:#8A919C; }}
    .sev-critical {{ color:#FF5C5C; font-weight:700; }} .sev-high {{ color:#FF9F1C; font-weight:700; }} .sev-medium {{ color:#F5C518; }}
    .tag {{ display:inline-block; font:400 28px "JetBrains Mono",Menlo,monospace; padding:1px 10px; border-radius:6px; border:2px solid #262B33; color:#2EC4B6; }}
    .sel {{ display:inline-block; background:#07090B; border:2px solid #262B33; border-radius:8px; padding:8px 44px 8px 16px; font-size:28px; }}
    .btn {{ display:inline-block; position:relative; background:#F5C518; color:#0B0D10; padding:12px 22px; border-radius:8px; font-weight:700; font-size:28px; }}
    .btn.ghost {{ background:transparent; color:#E8EAED; border:2px solid #262B33; }}
    #p-scan-b {{ position:absolute; left:0; right:0; top:12px; text-align:center; opacity:0; }}
    #p-github h2 {{ font-size:96px; font-weight:900; letter-spacing:-.02em; margin:44px 0 40px; }}
    #p-github table {{ font-size:44px; }}
    #p-github th, #p-github td {{ padding:26px 16px; vertical-align:middle; }}
    #p-github .mono {{ font-size:46px; }}
    #p-github .btn {{ font-size:40px; padding:20px 36px; border-radius:12px; }}
    #p-github #p-scan-b {{ top:20px; }}
    #p-github #p-scan {{ min-width:300px; text-align:center; }}
    #p-cursor {{ position:absolute; left:0; top:0; z-index:9; overflow:visible; }}
    #p-head {{ position:absolute; left:80px; right:80px; bottom:66px; font-weight:900; font-size:128px; line-height:1;
      letter-spacing:-.025em; text-transform:uppercase; }}
    #p-head .volt {{ color:#F5C518; }}
    .kicker {{ font:700 28px "JetBrains Mono",Menlo,monospace; color:#F5C518; letter-spacing:.18em; text-transform:uppercase; }}
    #p-edge {{ top:236px; }}
    #p-edge h1 {{ font-size:108px; white-space:nowrap; line-height:1.02; letter-spacing:-.02em; font-weight:900; margin:22px 0 46px; }}
    #p-edge pre {{ font:400 45px "JetBrains Mono",Menlo,monospace; background:#07090B; border:2px solid #262B33; border-radius:10px;
      padding:38px 40px; margin:0; white-space:pre; }}
    #p-edge .lead {{ color:#8A919C; font-size:58px; margin:44px 0 0; }}
  </style>
  <div id="root" data-composition-id="product" data-width="1920" data-height="1080">
    <div id="p-shell">
      <div id="p-nav"><span class="logo"><img src="assets/logo-mark.svg" alt="">BULWARK</span><span id="p-who">Springfield Water Authority</span></div>
    </div>
    <div id="p-tabs" class="clip" data-start="0" data-duration="{tabs_dur}" data-track-index="1">
      <span>Overview</span><span id="p-tab-findings" class="{fi_on}">Findings</span><span id="p-tab-github" class="{gh_on}">GitHub</span><span>Modules</span><span>Edge runners</span><span>Profile</span>
    </div>{gh_pane}
    <div id="p-findings" class="clip p-pane" data-start="{t_find}" data-duration="{find_dur}" data-track-index="3">
      <table>
        <tbody>
          <tr><th style="width:200px">Severity</th><th style="width:420px">Rule</th><th style="width:420px">Location</th><th>Detail</th><th style="width:180px">Status</th></tr>
{rows.replace('<tr id=', '<tr class="r" id=')}
        </tbody>
      </table>
    </div>
    <div id="p-head" class="clip" data-start="{t_head}" data-duration="{t_edge - t_head}" data-track-index="4" data-layout-allow-overlap><span class="w">Ranked</span> <span class="w">by</span> <span class="w volt">grid</span> <span class="w volt">impact</span></div>{edge_pane}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join('    ' + j for j in js).strip()}
    window.__timelines["product"] = tl;
  </script>
</template>
"""


def endcard(c):
    d = c["endcard"]["dur"]
    return f"""<template>
  <style>{BASE_CSS}
    #e-flood {{ position:absolute; inset:0; background:#F5C518; }}
    #e-lock {{ position:absolute; left:0; right:0; top:330px; display:flex; justify-content:center; align-items:center; gap:44px; }}
    #e-mark {{ width:230px; height:230px; flex:none; }}
    #e-mark svg {{ width:230px; height:230px; display:block; overflow:visible; }}
    #e-word {{ font-weight:900; font-size:190px; letter-spacing:.06em; line-height:1; color:#0B0D10; }}
    #e-tag {{ position:absolute; left:0; right:0; top:640px; text-align:center; font-weight:700; font-size:52px;
      letter-spacing:-.01em; color:#0B0D10; }}
  </style>
  <div id="root" data-composition-id="endcard" data-width="1920" data-height="1080">
    <div id="e-flood" data-layout-ignore></div>
    <div id="e-lock" class="clip" data-start="0" data-duration="{d}" data-track-index="1">
      <div id="e-mark"><svg viewBox="0 0 32 32"><g id="e-wall">{MARK_INK}</g><g id="e-bolt">{BOLT_VOLT}</g></svg></div>
      <div id="e-word">BULWARK</div>
    </div>
    <div id="e-tag" class="clip" data-start="0" data-duration="{d}" data-track-index="2" data-hold>{words("Security scanning for the software that runs the grid.")}</div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#e-flood", {{clipPath:"inset(100% 0% 0% 0%)"}}, {{clipPath:"inset(0% 0% 0% 0%)", duration:0.4, ease:"power2.inOut"}}, 0);
    tl.fromTo("#e-wall", {{clipPath:"inset(100% 0% 0% 0%)"}}, {{clipPath:"inset(0% 0% 0% 0%)", duration:0.35, ease:"power4.out"}}, 0.3);
    tl.fromTo("#e-bolt", {{opacity:0, scale:2.4, transformOrigin:"16px 17px"}}, {{opacity:1, scale:1, duration:0.1, ease:"power3.in"}}, 0.72);
    tl.fromTo("#e-word", {{clipPath:"inset(0% 100% 0% 0%)"}}, {{clipPath:"inset(0% 0% 0% 0%)", duration:0.4, ease:"power4.out"}}, 0.85);
    tl.fromTo("#e-tag .w", {{opacity:0, filter:"blur(6px)"}}, {{opacity:1, filter:"blur(0px)", duration:0.13, stagger:0.05, ease:"power2.out"}}, {1.2 if d >= 5 else 0.95});
    window.__timelines["endcard"] = tl;
  </script>
</template>
"""


def audio(c):
    m = c["montage"]; p = c["product"]; e = c["endcard"]
    hit = next(s for n, s, d in m["shots"] if n == "after2003")
    a = []
    def add(i, f, start, vol, dur=None, off=None):
        a.append(f'      <audio id="sfx-{i}" class="clip" src="assets/sfx/{f}.mp3" data-start="{round(start, 3)}"'
                 + (f' data-duration="{dur}"' if dur else "") + (f' data-media-start="{round(off, 3)}"' if off else "")
                 + f' data-volume="{vol}" data-track-index="{10 + len(a)}"></audio>')
    # Dark Shadows (Mixkit 64): 119.8 bpm, beats 0.035 s before each 0.5 s mark, lift at 24.985 s.
    # The lift lands on the end card start; every cut on the 0.5 s grid sits on a beat.
    ms = round(24.985 - e["start"] + 0.03, 3)
    a.append(f'      <audio id="music" class="clip" src="assets/music-dark-shadows.mp3" data-start="{0.03 if ms < 0.05 else 0}" '
             f'data-duration="{c["total"] - (0.03 if ms < 0.05 else 0)}" data-media-start="{max(0, ms)}" data-volume="0.85" '
             f'data-fade-in="{0.05 if ms < 0.05 else 0.25}" data-fade-out="1.5" data-track-index="9"></audio>')
    rs = max(0, hit - 4.4)   # riser.mp3 builds for 4.4 s, then decays
    add("riser", "riser", rs, 0.3, dur=round(hit - rs + 0.1, 3), off=4.4 - (hit - rs))
    add("blackout", "impact-bass-1", hit, 0.8)
    for k, (y, s, d) in enumerate(m["years"][1:-1]):
        add(f"year-{y}", "click-soft" if k % 2 else "click", s, 0.5)
    add("ui-in", "whoosh-short", p["start"] - 0.1, 0.6)
    if p["scan"]:
        add("scan-click", "click", p["start"] + 1.2, 0.9)
    row0 = p["start"] + (2.5 + 0.45 if p["scan"] else 0.4); gap = 0.35 if p["scan"] else 0.22
    for k in (0, 2, 4):
        add(f"row-{k}", "pop", row0 + gap * k, 0.4)
    if p["edge"]:
        add("typing", "typing", p["start"] + p["dur"] - 3.5 + 0.35, 0.6)
    add("flood", "whoosh-short", e["start"] - 0.05, 0.7)
    add("mark", "impact-bass-2", e["start"] + 0.72, 0.6)
    return "\n".join(a)


def index(name, c):
    hosts = "\n".join(
        f'      <div id="{s}" data-composition-id="{s}" data-composition-src="compositions/{s}.html" data-start="{c[s]["start"]}" '
        f'data-duration="{c[s]["dur"]}" data-track-index="{i}" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
        for i, s in enumerate(["montage", "question", "product", "endcard"]))
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Bulwark promo {int(c["total"])} s</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin:0; padding:0; box-sizing:border-box; }}
      html, body {{ margin:0; width:1920px; height:1080px; overflow:hidden; background:#0B0D10; }}
      #root {{ position:relative; width:1920px; height:1080px; overflow:hidden; background:#0B0D10; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{c["total"]}" data-width="1920" data-height="1080">
{hosts}
{audio(c)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""


for name, c in CUTS.items():
    d = os.path.join(ROOT, name); os.makedirs(os.path.join(d, "compositions"), exist_ok=True)
    open(os.path.join(d, "index.html"), "w").write(index(name, c))
    for s, fn in (("montage", montage), ("question", question), ("product", product), ("endcard", endcard)):
        open(os.path.join(d, "compositions", s + ".html"), "w").write(fn(c))
    print("wrote", name)
