#!/usr/bin/env python3
"""One visual, one idea. Python 3 standard library only. Import the helpers or run this file for an example:

    from visual import text, box, path, svg
    b = box(20, 20, 260, 48, "n", [("Placed", 12, 700, "t")])   # b.h is its height after fitting
    Path("flow.svg").write_text(svg(640, 220, b + path(...), "A flow that ..."))

Text is measured, boxes wrap and grow to fit, and the canvas grows to hold everything,
then scales down on narrow screens. svg() warns when boxes overlap, a line crosses text, or text crosses a box edge.
Box classes: n plain, s context (grey), f result (accent), o open (dashed).
Text classes: t ink, m muted, a accent. Light and dark come from the viewer's setting.
"""
import html
import re
import sys
from pathlib import Path

esc = html.escape
_texts, _rects, _lines = [], [], []


class Shape(str):
    """Markup that also knows its fitted height."""
    h = 0


def width(s, size, weight=400):
    """Rendered width for system-ui, erring wide."""
    em = sum(.3 if c in " il.,:;'|!()[]" else .9 if c in "mwMW@%" else .7 if c.isupper() else .56 for c in s)
    return em * size * (1.08 if weight >= 600 else 1) * 1.05  # headroom for wider fallback fonts


def wrap(s, size, weight, max_w):
    lines, cur = [], ""
    for word in s.split():
        while width(word, size, weight) > max_w:  # a word longer than the line: break it
            cut = len(word)
            while cut > 1 and width(word[:cut], size, weight) > max_w:
                cut -= 1
            if cur:
                lines.append(cur); cur = ""
            lines.append(word[:cut]); word = word[cut:]
        trial = f"{cur} {word}".strip()
        if cur and width(trial, size, weight) > max_w:
            lines.append(cur); cur = word
        else:
            cur = trial
    return lines + [cur] if cur else lines or [""]


def text(x, y, s, size=13, weight=400, cls="m", anchor="start"):
    w = width(s, size, weight)
    left = x - (w if anchor == "end" else w / 2 if anchor == "middle" else 0)
    _texts.append((s, left, y - size, left + w, y + size * .3))
    return f'<text x="{x}" y="{y}" class="{cls}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{esc(s)}</text>'


def box(x, y, w, h, cls, lines, pad=12):
    """lines: [(text, size, weight, text_class), ...] stacked from the top. Wraps to fit w; grows past h if needed."""
    out, cy = [], y + pad
    for s, size, weight, tcls in lines:
        for part in wrap(s, size, weight, w - 2 * pad):
            cy += size
            out.append(text(x + pad, cy, part, size, weight, tcls))
            cy += 6
    h = max(h, cy - 6 + pad - y)
    _rects.append((x, y, x + w, y + h))
    shape = Shape(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" class="{cls}"/>' + "".join(out))
    shape.h = h
    return shape

def path(d, accent=False, dashed=False):
    """d uses absolute M and L commands, e.g. "M10,20 L10,60 L80,60"."""
    pts = [tuple(map(float, xy.split(","))) for xy in re.findall(r"-?[\d.]+,-?[\d.]+", d)]
    _lines.extend(zip(pts, pts[1:]))
    dash = ' stroke-dasharray="4 4"' if dashed else ""
    return f'<path d="{d}" class="{"ea" if accent else "e"}"{dash} marker-end="url(#{"ha" if accent else "h"})"/>'


STYLE = """<style>
svg { --paper:#fff; --ink:#0a0a0a; --muted:#525252; --accent:#0000ff; --tint:rgba(0,0,255,.05); --fill:rgba(10,10,10,.05); --line:rgba(10,10,10,.3);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif }
@media (prefers-color-scheme: dark) { svg { --paper:#0d0d10; --ink:#f2f2f2; --muted:#a3a3a3; --accent:#8894ff; --tint:rgba(136,148,255,.12); --fill:rgba(255,255,255,.06); --line:rgba(255,255,255,.3) } }
.bg { fill: var(--paper) }
.n { fill: var(--paper); stroke: var(--ink) } .s { fill: var(--fill); stroke: var(--line) }
.f { fill: var(--tint); stroke: var(--accent); stroke-width: 1.2 } .o { fill: var(--paper); stroke: var(--ink); stroke-dasharray: 5 4 }
.t { fill: var(--ink) } .m { fill: var(--muted) } .a { fill: var(--accent) }
.e { stroke: var(--ink); stroke-width: 1.2; fill: none } .ea { stroke: var(--accent); stroke-width: 1.4; fill: none }
.hm { fill: var(--ink) } .ham { fill: var(--accent) }
</style>"""

DEFS = """<defs>
<marker id="h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="hm"/></marker>
<marker id="ha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ham"/></marker>
</defs>"""


def svg(w, h, body, label):
    """A standalone SVG. label is the accessible description: write it as a sentence."""
    for i, a in enumerate(_rects):
        for b in _rects[i + 1:]:
            if a[0] < b[2] + 6 and b[0] < a[2] + 6 and a[1] < b[3] + 6 and b[1] < a[3] + 6 and not (a[0] <= b[0] and b[2] <= a[2] and a[1] <= b[1] and b[3] <= a[3]):
                print(f"warning: boxes overlap or touch at ({b[0]}, {b[1]}): move one", file=sys.stderr)
    for (ax, ay), (bx, by) in _lines:
        for s, x0, y0, x1, y1 in _texts:
            if any(x0 < ax + (bx - ax) * t < x1 and y0 < ay + (by - ay) * t < y1 for t in [i / 20 for i in range(21)]):
                print(f"warning: a line crosses text: {s}", file=sys.stderr)
    for s, x0, y0, x1, y1 in _texts:
        for rx0, ry0, rx1, ry1 in _rects:
            crosses = x0 < rx1 and rx0 < x1 and y0 < ry1 and ry0 < y1
            inside = rx0 <= x0 and x1 <= rx1 and ry0 <= y0 and y1 <= ry1
            if crosses and not inside:
                print(f"warning: text crosses a box edge: {s}", file=sys.stderr)
                break
    every = [t[1:] for t in _texts] + _rects
    x0, y0 = min([0] + [r[0] - 8 for r in every]), min([0] + [r[1] - 8 for r in every])
    w, h = max([w] + [r[2] + 8 for r in every]) - x0, max([h] + [r[3] + 8 for r in every]) - y0
    _texts.clear(), _rects.clear(), _lines.clear()
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:g} {y0:g} {w:g} {h:g}" width="100%" style="max-width:{w:g}px;height:auto" role="img" aria-label="{esc(label)}">'
            f'{STYLE}{DEFS}<rect class="bg" x="{x0:g}" y="{y0:g}" width="{w:g}" height="{h:g}"/>{body}</svg>')


def example():
    b = box(20, 20, 260, 48, "n", [("1  Measure it", 12, 700, "t"), ("in its own units", 11, 400, "m")])
    b += path("M150,68 L150,92")
    b += box(20, 96, 260, 48, "o", [("2  Above the threshold?", 12, 700, "t"), ("dashed: still to measure", 11, 400, "m")])
    b += path("M150,144 L150,168") + text(158, 162, "no", 10, 700, "m")
    b += box(20, 172, 260, 44, "f", [("Keep the default", 12, 700, "a")])
    b += path("M280,120 L330,120") + text(305, 112, "yes", 10, 700, "m", "middle")
    b += box(334, 96, 160, 48, "f", [("Switch", 12, 700, "a"), ("it has to earn it", 11, 400, "m")])
    b += box(520, 20, 200, 124, "s", [("Worked example", 12, 700, "a"), ("A 400k, B 900k = 2.25x", 11, 400, "m"), ("stays on A", 11, 700, "t"), ("simulated", 11, 400, "m")])
    return svg(740, 236, b, "Measure, compare with a threshold, then keep the default or switch, with a worked example.")


if __name__ == "__main__":
    Path(sys.argv[1] if len(sys.argv) > 1 else "example.svg").write_text(example())
