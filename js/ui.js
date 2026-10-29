// Shared drawing helpers: class colors, plane geometry and axes, 2-d
// vector math, SVG strings for lines and arrows, pointer dragging and
// number formatting. Every plane shows the square [-3, 3]^2.

const SVGNS = "http://www.w3.org/2000/svg";
// Class colors indexed by (y + 1) / 2: y = -1 blue, y = +1 orange.
const COLORS = ["#2563eb", "#ea580c"];

const PLANE = { w: 700, h: 700, x0: 46, x1: 686, y0: 14, y1: 654,
  dom: [-3, 3] };

/** Scales of plot box p: data to viewBox (sx, sy) and back (ix, iy). */
function scales(p) {
  const k = (p.x1 - p.x0) / (p.dom[1] - p.dom[0]);
  return {
    k,
    sx: v => p.x0 + (v - p.dom[0]) * k,
    sy: v => p.y1 - (v - p.dom[0]) * k,
    ix: px => p.dom[0] + (px - p.x0) / k,
    iy: py => p.dom[0] + (p.y1 - py) / k,
  };
}
const S = scales(PLANE);

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const norm = a => Math.hypot(a[0], a[1]);
/** a turned 90 degrees counterclockwise. */
const perp = a => [-a[1], a[0]];

/** Data point to "x,y" in viewBox units. */
function px(p) { return `${S.sx(p[0]).toFixed(1)},${S.sy(p[1]).toFixed(1)}`; }

/**
 * Clip the line p + t d to the plot square.
 *
 * Returns:
 *   [a, b] (data points) of the visible segment, or null if it misses
 */
function clipLine(p, d, dom = PLANE.dom) {
  let lo = -Infinity, hi = Infinity;
  for (let k = 0; k < 2; k++) {
    if (Math.abs(d[k]) < 1e-12) {
      if (p[k] < dom[0] || p[k] > dom[1]) return null;
      continue;
    }
    const t0 = (dom[0] - p[k]) / d[k], t1 = (dom[1] - p[k]) / d[k];
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
  }
  if (lo > hi) return null;
  return [add(p, mul(d, lo)), add(p, mul(d, hi))];
}

/** Point of the line w·x = b nearest the origin: (b / w·w) w. */
function footOrigin(w, b) { return mul(w, b / dot(w, w)); }

/** SVG line for w·x = b across the plot (empty if it misses). */
function lineSvg(w, b, attrs) {
  const seg = clipLine(footOrigin(w, b), perp(w));
  if (!seg) return "";
  const [a, c] = seg;
  return `<line x1="${S.sx(a[0])}" y1="${S.sy(a[1])}" x2="${S.sx(c[0])}"
    y2="${S.sy(c[1])}" ${attrs}/>`;
}

/** SVG segment between data points a and c. */
function segSvg(a, c, attrs) {
  return `<line x1="${S.sx(a[0])}" y1="${S.sy(a[1])}" x2="${S.sx(c[0])}"
    y2="${S.sy(c[1])}" ${attrs}/>`;
}

/**
 * SVG arrow from data point a to c, head drawn as a polygon.
 *
 * Args:
 *   cls (string): CSS class of the group (sets stroke and fill)
 *   s (object): scales to draw with (default the plane)
 */
function arrowSvg(a, c, cls, s = S, head = 13) {
  const x1 = s.sx(a[0]), y1 = s.sy(a[1]), x2 = s.sx(c[0]), y2 = s.sy(c[1]);
  const L = Math.hypot(x2 - x1, y2 - y1);
  if (L < 1) return "";
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, h = Math.min(head, L * .6);
  const bx = x2 - ux * h, by = y2 - uy * h;
  const pts = [[x2, y2], [bx - uy * h * .42, by + ux * h * .42],
    [bx + uy * h * .42, by - ux * h * .42]];
  return `<g class="arrow ${cls}"><line x1="${x1}" y1="${y1}" x2="${bx}"
    y2="${by}"/><polygon points="${pts.map(q => q.join(",")).join(" ")}"/>
    </g>`;
}

/** Right-angle mark at data point at, between unit directions u and v. */
function rightAngleSvg(at, u, v, size = 0.22) {
  const a = add(at, mul(u, size)), c = add(at, mul(v, size));
  const m = add(a, mul(v, size));
  return `<path class="rt" d="M${px(a)} L${px(m)} L${px(c)}"/>`;
}

/**
 * Polygon of the plot square on the side w·x - b > 0 (sgn 1) or < 0
 * (sgn -1), by clipping the square against the half-plane.
 */
function halfPlane(w, b, sgn) {
  const [lo, hi] = PLANE.dom;
  const sq = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]];
  const f = p => sgn * (dot(w, p) - b);
  const out = [];
  for (let i = 0; i < 4; i++) {
    const p = sq[i], q = sq[(i + 1) % 4], fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) out.push(add(p, mul(sub(q, p),
      fp / (fp - fq))));
  }
  return out.length ? out.map(px).join(" ") : "";
}

/** Grid lines, ticks and axis labels of the plane. */
function axesSvg() {
  const p = PLANE;
  let a = "";
  for (let v = p.dom[0]; v <= p.dom[1]; v++) {
    a += `<line class="grid${v === 0 ? " zero" : ""}" x1="${S.sx(v)}"
      x2="${S.sx(v)}" y1="${p.y0}" y2="${p.y1}"/><line class="grid${
      v === 0 ? " zero" : ""}" x1="${p.x0}" x2="${p.x1}" y1="${S.sy(v)}"
      y2="${S.sy(v)}"/><text class="tick" x="${S.sx(v)}" y="${p.y1 + 16}"
      text-anchor="middle">${fmt(v, 0)}</text><text class="tick"
      x="${p.x0 - 7}" y="${S.sy(v) + 4}"
      text-anchor="end">${fmt(v, 0)}</text>`;
  }
  a += `<text class="axis-label" x="${(p.x0 + p.x1) / 2}" y="${p.y1 + 38}"
    text-anchor="middle"><tspan class="sym">x</tspan>₀</text>
    <text class="axis-label" text-anchor="middle"
    transform="translate(16 ${(p.y0 + p.y1) / 2}) rotate(-90)"
    ><tspan class="sym">x</tspan>₁</text>`;
  return a;
}

/** Plane SVG element with its viewBox set. */
function planeSvg(id) {
  const el = document.getElementById(id);
  el.setAttribute("viewBox", `0 0 ${PLANE.w} ${PLANE.h}`);
  return el;
}

/** Pointer position in the viewBox units of an SVG. */
function svgPoint(el, e) {
  const pt = el.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(el.getScreenCTM().inverse());
}

/** Pointer position on the plane, in data units. */
function planePoint(el, e) {
  const q = svgPoint(el, e);
  return [S.ix(q.x), S.iy(q.y)];
}

/**
 * Route pointer drags on svg to handlers.
 *
 * Args:
 *   h.down (Function): (handle, p, e) -> bool, handle = data-h of the
 *     element under the pointer (or null), p the data point; return true
 *     to start a drag
 *   h.move (Function): (p, e) during the drag
 *   h.up (Function | undefined): (e) at the end
 */
function dragOn(svg, h) {
  svg.addEventListener("pointerdown", e => {
    const t = e.target.closest("[data-h]");
    if (!h.down(t ? t.dataset.h : null, planePoint(svg, e), e)) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const move = ev => h.move(planePoint(svg, ev), ev);
    const up = ev => {
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      if (h.up) h.up(ev);
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  });
}

/** Number with a true minus sign. */
function fmt(x, digits = 2) {
  const a = Math.abs(x).toFixed(digits);
  return (x < 0 && a !== (0).toFixed(digits) ? "−" : "") + a;
}

/** Vector [a, b] as HTML with true minus signs. */
function fvec(v, digits = 2) {
  return `[${fmt(v[0], digits)}, ${fmt(v[1], digits)}]`;
}

/** C to two significant figures, without trailing zeros. */
function fmtC(c) { return String(Number(c.toPrecision(2))); }

function classDot(y) {
  return `<span class="dot" style="background:${COLORS[(y + 1) / 2]}"></span>`;
}

/** Sample circles; class s, data-h "s<i>" for dragging. */
function samplesSvg(X, y, extra = () => "") {
  let s = "";
  for (let i = 0; i < X.length; i++) {
    s += `<circle class="s" data-h="s${i}" cx="${S.sx(X[i][0])}"
      cy="${S.sy(X[i][1])}" r="8" fill="${COLORS[(y[i] + 1) / 2]}"
      ${extra(i)}/>`;
  }
  return s;
}

// Footer build stamp: the deployed commit (linked) and build time.
(function () {
  const el = document.getElementById("build");
  const repo = "https://github.com/matthigger/svm";
  if (!BUILD) { el.textContent = "local copy"; return; }
  const when = new Date(BUILD.time).toLocaleString("en-US", {
    dateStyle: "medium", timeStyle: "short" });
  el.innerHTML = `build <a href="${repo}/commit/${BUILD.sha}">${
    BUILD.sha.slice(0, 7)}</a>, ${when}`;
})();
