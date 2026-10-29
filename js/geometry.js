// Margin geometry tab: six steps from the line w·x = 0 to the margin of
// any point, (w·x - b) / ‖w‖, following the lesson 16 panels. Steps 1-2
// draw the line through the origin (b = 0); from step 4 on, w has unit
// length unless "let ‖w‖ vary" is checked.

const geo = {
  step: 1, w: [1.2, 1.6], b: 3, ta: 1.5, tb: -1.3, alpha: 2.6,
  x: [2.2, 1.8], free: false, drag: null,
};
const gSvg = planeSvg("g-stage");

function gB() { return geo.step <= 2 ? 0 : geo.b; }
function gUnit() { return geo.step >= 4 && !geo.free; }

/** Rescale w and b together (the line stays) so that ‖w‖ = r. */
function gScale(r) {
  const k = r / norm(geo.w);
  geo.w = mul(geo.w, k);
  geo.b *= k;
}

/** Text label at data point p, nudged by (dx, dy) viewBox units. */
function gLabel(p, html, cls, dx = 8, dy = -8, anchor = "start") {
  return `<text class="lbl ${cls}" x="${S.sx(p[0]) + dx}"
    y="${S.sy(p[1]) + dy}" text-anchor="${anchor}">${html}</text>`;
}

/** SVG text for a bold-free italic symbol with a dy subscript. */
function subT(sym, s) {
  return `<tspan class="sym">${sym}</tspan><tspan dy="5"
    font-size="72%">${s}</tspan><tspan dy="-5"> </tspan>`;
}

const W_T = '<tspan class="vec">w</tspan>';

function geoRender() {
  const st = geo.step, w = geo.w, b = gB(), n = norm(w), u = mul(w, 1 / n);
  const d = perp(u), F = footOrigin(w, b);
  let s = axesSvg(), top = "";

  if (st === 6) {
    s += `<polygon class="half pos" points="${halfPlane(w, b, 1)}"/>
      <polygon class="half neg" points="${halfPlane(w, b, -1)}"/>`;
  }
  if (st >= 3) {
    s += `<circle class="unit" cx="${S.sx(0)}" cy="${S.sy(0)}"
      r="${S.k}"/>`;
  }
  if (st >= 4) {
    const seg = clipLine([0, 0], u);
    if (seg) s += segSvg(seg[0], seg[1], 'class="axis-w"');
  }

  s += lineSvg(w, b, 'class="bound"');
  if (st >= 3) s += lineSvg(w, b, 'class="hit" data-h="line"');
  const lineEnd = clipLine(F, d);
  if (lineEnd) {
    const e = lineEnd[1], right = e[0] > 2.5;
    top += gLabel(e, `${W_T}·<tspan class="vec">x</tspan> = ${
      st <= 2 ? "0" : "<tspan class='sym'>b</tspan>"}`, "ink",
      right ? -10 : 8, e[1] > 2.5 ? 22 : -8, right ? "end" : "start");
  }

  if (st === 1 && Math.abs(w[1]) > 1e-6) {
    const m = -w[0] / w[1], r = Math.min(1, 1.2 / Math.abs(m));
    const P = mul(d[0] >= 0 ? d : mul(d, -1), 0.9);
    const Cn = add(P, [r, 0]), E = add(P, [r, m * r]);
    s += `<path class="slope" d="M${px(P)} L${px(Cn)} L${px(E)}"/>`;
    top += gLabel(add(P, [r / 2, 0]), fmt(r), "green", 0, m > 0 ? 18 : -8,
      "middle");
    top += gLabel(add(Cn, [0, m * r / 2]), fmt(m * r), "green", 8, 5);
  }
  if (st === 2) {
    const A = mul(d, geo.ta), B = mul(d, geo.tb);
    s += rightAngleSvg([0, 0], u, d);
    s += arrowSvg(B, A, "green");
    top += `<circle class="pt" data-h="xa" cx="${S.sx(A[0])}"
      cy="${S.sy(A[1])}" r="8"/><circle class="pt" data-h="xb"
      cx="${S.sx(B[0])}" cy="${S.sy(B[1])}" r="8"/>`;
    top += gLabel(A, subT("x", "A"), "ink", 10, 22);
    top += gLabel(B, subT("x", "B"), "ink", 10, 22);
    top += gLabel(add(mul(add(A, B), 0.5), mul(u, -0.3)),
      `${subT("x", "A")}−${subT("x", "B")}`, "green", 0, 6, "middle");
  }
  if (st === 3 && Math.abs(n - 1) > 0.02) {
    s += arrowSvg([0, 0], u, "unitw");
    top += gLabel(u, `${W_T} / ‖${W_T}‖`, "muted", 8, 18);
  }
  if (st >= 4) {
    s += rightAngleSvg(F, mul(u, -Math.sign(b || 1)), d);
    s += segSvg([0, 0], F, 'class="dist"');
    top += `<circle class="mark" cx="${S.sx(F[0])}" cy="${S.sy(F[1])}"
      r="6"/>`;
    top += gLabel(F, gUnit() ? `<tspan class="sym">b</tspan>${W_T}` :
      `(<tspan class="sym">b</tspan> / ‖${W_T}‖²) ${W_T}`, "ink", -12, 4,
      "end");
  }
  if (st === 5) {
    const A = mul(w, geo.alpha);
    s += segSvg(F, A, 'class="marg"');
    top += `<circle class="pt" data-h="alpha" cx="${S.sx(A[0])}"
      cy="${S.sy(A[1])}" r="8"/>`;
    top += gLabel(A, `<tspan class="sym">α</tspan>${W_T}`, "ink", 12, 5);
  }
  if (st === 6) {
    const x = geo.x, c = dot(x, w) / dot(w, w), P = mul(w, c);
    const L = sub(x, mul(w, (dot(w, x) - b) / dot(w, w)));
    s += segSvg(x, P, 'class="proj"');
    s += rightAngleSvg(P, mul(u, -Math.sign(c || 1)), mul(d,
      Math.sign(dot(sub(x, P), d)) || 1), 0.16);
    s += segSvg(F, P, 'class="marg"');
    s += segSvg(x, L, 'class="marg dash"');
    top += `<circle class="mark" cx="${S.sx(P[0])}" cy="${S.sy(P[1])}"
      r="6"/>`;
    top += gLabel(P, `<tspan class="sym">c</tspan>${W_T}`, "ink", 10, 18);
    top += `<circle class="pt" data-h="x" cx="${S.sx(x[0])}"
      cy="${S.sy(x[1])}" r="9"/>`;
    top += gLabel(x, '<tspan class="vec">x</tspan>', "ink", 12, -10);
  }

  s += arrowSvg([0, 0], w, "w");
  top += `<circle class="tip" data-h="w" cx="${S.sx(w[0])}"
    cy="${S.sy(w[1])}" r="11"/>`;
  top += gLabel(w, W_T, "violet", 12, -10);
  gSvg.innerHTML = s + top;
  geoReadout();
}

/** Live arithmetic for the current step. */
function geoReadout() {
  const st = geo.step, w = geo.w, b = gB(), n = norm(w);
  const W = "<b>w</b>", X = "<b>x</b>";
  const rows = [];
  const row = (k, v) => rows.push(`<div class="row"><span>${k}</span>
    <span class="val">${v}</span></div>`);
  row(W, fvec(w));
  if (st === 1) {
    const m = Math.abs(w[1]) > 1e-6 ? fmt(-w[0] / w[1]) : "undefined";
    row(`${W}·${X} = 0`, `${fmt(w[0])} <i>x</i>₀ + ${fmt(w[1])} <i>x</i>₁
      = 0`);
    row("slope &minus;<i>w</i>₀ / <i>w</i>₁", m);
  } else if (st === 2) {
    const d = perp(mul(w, 1 / n)), A = mul(d, geo.ta), B = mul(d, geo.tb);
    row(`<b>x</b><sub>A</sub>, <b>x</b><sub>B</sub>`, `${fvec(A)}, ${
      fvec(B)}`);
    row(`${W}·<b>x</b><sub>A</sub>`, fmt(dot(w, A)));
    row(`${W}·<b>x</b><sub>B</sub>`, fmt(dot(w, B)));
    row(`${W}·(<b>x</b><sub>A</sub> &minus; <b>x</b><sub>B</sub>)`,
      `${fmt(dot(w, A))} &minus; ${fmt(dot(w, B))} = ${fmt(dot(w,
      sub(A, B)))}`);
  } else if (st === 3) {
    row("<i>b</i>", fmt(geo.b));
    row("‖<b>w</b>‖", fmt(n));
    row("line", `${fmt(w[0])} <i>x</i>₀ + ${fmt(w[1])} <i>x</i>₁ = ${
      fmt(geo.b)}`);
    row("÷ ‖<b>w</b>‖", `${fmt(w[0] / n)} <i>x</i>₀ + ${fmt(w[1] / n)}
      <i>x</i>₁ = ${fmt(geo.b / n)}`);
  } else {
    const F = footOrigin(w, b);
    row("<i>b</i>", fmt(b));
    if (!gUnit()) row("‖<b>w</b>‖", fmt(n));
    if (st === 4) {
      row(gUnit() ? `<i>b</i>${W}` : `(<i>b</i>/‖${W}‖²) ${W}`, fvec(F));
      row(`${W}·(<i>b</i>${W})`, gUnit()
        ? `<i>b</i> ‖${W}‖² = ${fmt(b)}`
        : `<i>b</i> ‖${W}‖² = ${fmt(b * n * n)}`);
      row("distance to origin", `|<i>b</i>| / ‖${W}‖ = ${fmt(Math.abs(b) /
        n)}`);
    } else if (st === 5) {
      const al = geo.alpha;
      row("<i>α</i>", fmt(al));
      row(`‖<i>α</i>${W} &minus; <i>b</i>${W}‖`, gUnit()
        ? `|<i>α</i> &minus; <i>b</i>| = ${fmt(Math.abs(al - b))}`
        : `|<i>α</i>‖${W}‖ &minus; <i>b</i>/‖${W}‖| = ${
          fmt(Math.abs(al * n - b / n))}`);
      row("signed margin", gUnit()
        ? `<i>α</i> &minus; <i>b</i> = ${fmt(al - b)}`
        : fmt(al * n - b / n));
    } else {
      const x = geo.x, c = dot(x, w) / dot(w, w);
      row(X, fvec(x));
      row(`<i>c</i> = ${X}·${W} / ${W}·${W}`, gUnit()
        ? `${X}·${W} = ${fmt(c)}` : fmt(c));
      row("margin", gUnit()
        ? `${X}·${W} &minus; <i>b</i> = ${fmt(dot(x, w) - b)}`
        : `(${W}·${X} &minus; <i>b</i>) / ‖${W}‖ = ${
          fmt((dot(x, w) - b) / n)}`);
      row("side", dot(x, w) - b >= 0 ? "positive (+1)" : "negative (−1)");
    }
  }
  document.getElementById("g-read").innerHTML = rows.join("");
}

function geoSetStep(k) {
  geo.step = k;
  if (gUnit()) gScale(1);
  for (const el of document.querySelectorAll("[data-step]")) {
    el.hidden = !el.dataset.step.split(" ").includes(String(k));
  }
  for (const btn of document.querySelectorAll("#g-steps button")) {
    btn.setAttribute("aria-checked", btn.dataset.go === String(k));
  }
  document.getElementById("g-prev").disabled = k === 1;
  document.getElementById("g-next").disabled = k === 6;
  geoSyncScale();
  geoRender();
}

function geoSyncScale() {
  const n = norm(geo.w);
  document.getElementById("g-norm").value = Math.log10(n);
  document.getElementById("g-normval").textContent = fmt(n);
}

dragOn(gSvg, {
  down(h) {
    geo.drag = h;
    return h !== null;
  },
  move(p) {
    const h = geo.drag, n = norm(geo.w), u = mul(geo.w, 1 / n);
    const q = [clamp(p[0], -3, 3), clamp(p[1], -3, 3)];
    if (h === "w") {
      const r = norm(q);
      if (r < 0.15) return;
      if (geo.step <= 2 || (geo.step >= 4 && geo.free)) {
        // b follows so the line keeps its distance from the origin.
        const dist = gB() / n;
        geo.w = q;
        geo.b = dist * r;
      } else {
        const dist = geo.b / n;
        geo.w = mul(q, n / r);
        geo.b = dist * n;
      }
      geoSyncScale();
    } else if (h === "line") {
      geo.b = dot(geo.w, q);
    } else if (h === "xa" || h === "xb") {
      const t = clamp(dot(q, perp(u)), -2.8, 2.8);
      if (h === "xa") geo.ta = t; else geo.tb = t;
    } else if (h === "alpha") {
      geo.alpha = dot(q, geo.w) / (n * n);
    } else if (h === "x") {
      geo.x = q;
    }
    geoRender();
  },
  up() { geo.drag = null; },
});

document.getElementById("g-steps").innerHTML = [1, 2, 3, 4, 5, 6]
  .map(k => `<button role="radio" data-go="${k}">${k}</button>`).join("");
for (const btn of document.querySelectorAll("#g-steps button")) {
  btn.onclick = () => geoSetStep(Number(btn.dataset.go));
}
document.getElementById("g-prev").onclick = () => geoSetStep(geo.step - 1);
document.getElementById("g-next").onclick = () => geoSetStep(geo.step + 1);
document.getElementById("g-norm").oninput = e => {
  gScale(10 ** Number(e.target.value));
  geoSyncScale();
  geoRender();
};
document.getElementById("g-one").onclick = () => {
  gScale(1);
  geoSyncScale();
  geoRender();
};
document.getElementById("g-free").onchange = e => {
  geo.free = e.target.checked;
  if (gUnit()) gScale(1);
  geoSyncScale();
  geoRender();
};

function geoShow() { geoSetStep(geo.step); }
