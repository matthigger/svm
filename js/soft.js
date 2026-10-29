// Soft-margin tab: the fit at the chosen C with each sample's slack drawn
// as a stick to its own margin line, the margin and support-vector count
// swept over C, and the hinge loss each sample pays (refit on every change;
// the warm-started sweep is cheap at these sizes).

const soft = {
  nPer: 20, sep: 1.6, logC: 0, seed: 11, X: [], y: [], X0: [], y0: [],
  fit: null, sweep: null, hover: -1, drag: null,
};
const sSvg = planeSvg("s-stage");
// log10 C on the sweep grid, and the slider's range.
const LOGC = [];
for (let v = -2; v <= 3 + 1e-9; v += 0.125) LOGC.push(v);

function softData() {
  const d = makeBlobs(soft.nPer, soft.sep, 0.55, soft.seed);
  soft.X = d.X;
  soft.y = d.y;
  soft.X0 = d.X.map(x => x.slice());
  soft.y0 = d.y.slice();
}

function softSolve() {
  soft.fit = fitSvm(soft.X, soft.y, 10 ** soft.logC);
  soft.sv = supportOf(soft.fit);
}

/**
 * Refit over the C grid, small to large, each fit warm-started from the
 * last (alpha <= C still holds as C grows).
 */
function softSweep() {
  let prev = null;
  soft.sweep = LOGC.map(lc => {
    const f = fitSvm(soft.X, soft.y, 10 ** lc, prev && prev.alpha);
    prev = f;
    return { lc, width: 1 / norm(f.w), nsv: supportOf(f).length };
  });
}

/** Slack case of sample i: 0 outside the margin, 1 inside, 2 wrong side. */
function caseOf(xi) { return xi <= 1e-6 ? 0 : xi <= 1 ? 1 : 2; }

function softRender() {
  const { X, y } = soft, fit = soft.fit, { w, b } = fit, n = norm(w);
  let s = axesSvg();
  s += `<polygon class="half pos" points="${halfPlane(w, b, 1)}"/>
    <polygon class="half neg" points="${halfPlane(w, b, -1)}"/>`;
  s += lineSvg(w, b + 1, 'class="edge"');
  s += lineSvg(w, b - 1, 'class="edge"');
  s += lineSvg(w, b, 'class="bound"');

  // 1/‖w‖ bracket from the boundary to the +1 margin line, near the data.
  const mean = mul(X.reduce(add, [0, 0]), 1 / X.length);
  const F = sub(mean, mul(w, (dot(w, mean) - b) / (n * n)));
  const G = add(F, mul(w, 1 / (n * n)));
  s += segSvg(F, G, 'class="marg"');
  const gx = clamp(S.sx(G[0]) + 8, PLANE.x0 + 4, PLANE.x1 - 150);
  const gy = clamp(S.sy(G[1]) - 6, PLANE.y0 + 18, PLANE.y1 - 6);
  let top = `<text class="lbl green" x="${gx}" y="${gy}">1/‖<tspan
    class="vec">w</tspan>‖ = ${fmt(1 / n)}</text>`;

  for (let i = 0; i < X.length; i++) {
    const c = caseOf(fit.xi[i]);
    if (!c) continue;
    const foot = sub(X[i], mul(w, (fit.f[i] - y[i]) / (n * n)));
    s += segSvg(X[i], foot, `class="slack c${c}"`);
  }
  for (const i of soft.sv) {
    top += `<circle class="ring${fit.alpha[i] >= fit.C * (1 - 1e-9) ?
      " bound" : ""}" cx="${S.sx(X[i][0])}" cy="${S.sy(X[i][1])}" r="13"/>`;
  }
  s += samplesSvg(X, y, i => `data-i="${i}"`);
  if (soft.hover >= 0) {
    const p = X[soft.hover];
    top += `<circle class="hov" cx="${S.sx(p[0])}" cy="${S.sy(p[1])}"
      r="17"/>`;
  }
  sSvg.innerHTML = s + top;
  softReadout();
  softSweepChart();
  softHinge();
}

function softReadout() {
  const fit = soft.fit, n = norm(fit.w), N = soft.X.length;
  const sumXi = fit.xi.reduce((a, v) => a + v, 0);
  const cases = [0, 0, 0];
  for (const v of fit.xi) cases[caseOf(v)]++;
  const nBound = soft.sv.filter(i => fit.alpha[i] >= fit.C * (1 - 1e-9))
    .length;
  const row = (k, v) => `<div class="row"><span>${k}</span>
    <span class="val">${v}</span></div>`;
  document.getElementById("s-read").innerHTML =
    row("<b>w</b>, <i>b</i>", `${fvec(fit.w)}, ${fmt(fit.b)}`) +
    row("margin 1 / ‖<b>w</b>‖", fmt(1 / n)) +
    row("½‖<b>w</b>‖²", fmt(0.5 * n * n)) +
    row(`<i>C</i> &sum; <i>ξ<sub>i</sub></i>`,
      `${fmtC(fit.C)} &times; ${fmt(sumXi)} = ${fmt(fit.C * sumXi)}`) +
    row("objective", fmt(0.5 * n * n + fit.C * sumXi)) +
    row("support vectors", `${soft.sv.length} <span class="muted">(${
      nBound} with <i>α</i> = <i>C</i>)</span>`) +
    row('<i class="kc c0"></i>outside the margin, <i>ξ</i> = 0', cases[0]) +
    row('<i class="kc c1"></i>inside, 0 &lt; <i>ξ</i> &le; 1', cases[1]) +
    row('<i class="kc c2"></i>wrong side, <i>ξ</i> &gt; 1', cases[2]) +
    row("training error", `${Math.round(100 * cases[2] / N)}%`);

  const i = soft.hover, el = document.getElementById("s-hover");
  if (i < 0) {
    el.innerHTML = '<p class="muted">Point at a sample (on the plot or the ' +
      'hinge chart) to see its numbers.</p>';
    return;
  }
  const yi = soft.y[i];
  el.innerHTML = `<h3>Sample ${classDot(yi)}${yi > 0 ? "+1" : "&minus;1"}
    </h3>` +
    row("<b>w</b>·<b>x</b> &minus; <i>b</i>", fmt(fit.f[i])) +
    row("<i>y</i>(<b>w</b>·<b>x</b> &minus; <i>b</i>)", fmt(yi * fit.f[i])) +
    row("slack <i>ξ</i>", fmt(fit.xi[i])) +
    row("<i>α</i>", fmt(fit.alpha[i], 3)) +
    row("case", ["outside the margin", "inside the margin",
      "wrong side"][caseOf(fit.xi[i])]);
}

const HINGE = { w: 520, h: 224, x0: 40, x1: 508, y0: 24, y1: 182,
  xdom: [-3, 3], ydom: [0, 4] };

/** Each sample at (y_i f_i, xi_i) on the hinge max(0, 1 - y f). */
function softHinge() {
  const p = HINGE, fit = soft.fit;
  const sx = v => p.x0 + (clamp(v, ...p.xdom) - p.xdom[0]) /
    (p.xdom[1] - p.xdom[0]) * (p.x1 - p.x0);
  const sy = v => p.y1 - (clamp(v, ...p.ydom) - p.ydom[0]) /
    (p.ydom[1] - p.ydom[0]) * (p.y1 - p.y0);
  let s = `<rect class="zone c2" x="${p.x0}" y="${p.y0}"
    width="${sx(0) - p.x0}" height="${p.y1 - p.y0}"/><rect class="zone c1"
    x="${sx(0)}" y="${p.y0}" width="${sx(1) - sx(0)}"
    height="${p.y1 - p.y0}"/>`;
  for (let v = -3; v <= 3; v++) {
    s += `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${p.y0}"
      y2="${p.y1}"/><text class="tick" x="${sx(v)}" y="${p.y1 + 14}"
      text-anchor="middle">${fmt(v, 0)}</text>`;
  }
  for (let v = 0; v <= 4; v++) {
    s += `<line class="grid" x1="${p.x0}" x2="${p.x1}" y1="${sy(v)}"
      y2="${sy(v)}"/><text class="tick" x="${p.x0 - 6}" y="${sy(v) + 4}"
      text-anchor="end">${v}</text>`;
  }
  s += `<text class="zl" x="${(p.x0 + sx(0)) / 2}" y="${p.y0 - 8}"
    text-anchor="middle">wrong side</text><text class="zl" x="${sx(0.5)}"
    y="${p.y0 - 8}" text-anchor="middle">inside</text><text class="zl"
    x="${(sx(1) + p.x1) / 2}" y="${p.y0 - 8}"
    text-anchor="middle">outside the margin</text>`;
  s += `<polyline class="hinge" points="${sx(-3)},${sy(4)} ${sx(1)},${sy(0)}
    ${sx(3)},${sy(0)}"/>`;
  s += `<text class="axis-label sm" x="${(p.x0 + p.x1) / 2}"
    y="${p.y1 + 32}" text-anchor="middle"><tspan class="sym">y</tspan>(<tspan
    class="vec">w</tspan>·<tspan class="vec">x</tspan> − <tspan
    class="sym">b</tspan>)</text><text class="axis-label sm"
    text-anchor="middle" x="12" y="${(p.y0 + p.y1) / 2 + 4}"><tspan
    class="sym">ξ</tspan></text>`;
  for (let i = 0; i < soft.X.length; i++) {
    const m = soft.y[i] * fit.f[i];
    s += `<circle class="hd${i === soft.hover ? " on" : ""}" data-i="${i}"
      cx="${sx(m)}" cy="${sy(fit.xi[i])}" r="${i === soft.hover ? 7 : 5}"
      fill="${COLORS[(soft.y[i] + 1) / 2]}"/>`;
  }
  document.getElementById("s-hinge").innerHTML = s;
}

const SWEEP = { w: 520, h: 224, x0: 40, x1: 508, top: [8, 84],
  bot: [106, 182] };

/** Margin and support vectors against log C; the current C marked. */
function softSweepChart() {
  const p = SWEEP, sw = soft.sweep;
  const sx = lc => p.x0 + (lc + 2) / 5 * (p.x1 - p.x0);
  const wMax = niceCeil(Math.max(...sw.map(r => r.width)));
  const N = soft.X.length;
  const yT = v => p.top[1] - v / wMax * (p.top[1] - p.top[0]);
  const yB = v => p.bot[1] - v / N * (p.bot[1] - p.bot[0]);
  let s = "";
  for (let lc = -2; lc <= 3; lc++) {
    s += `<line class="grid" x1="${sx(lc)}" x2="${sx(lc)}" y1="${p.top[0]}"
      y2="${p.top[1]}"/><line class="grid" x1="${sx(lc)}" x2="${sx(lc)}"
      y1="${p.bot[0]}" y2="${p.bot[1]}"/><text class="tick" x="${sx(lc)}"
      y="${p.bot[1] + 14}" text-anchor="middle">${fmtC(10 ** lc)}</text>`;
  }
  for (const [v, yy] of [[0, yT(0)], [wMax, yT(wMax)], [0, yB(0)],
    [N, yB(N)]]) {
    s += `<line class="grid" x1="${p.x0}" x2="${p.x1}" y1="${yy}"
      y2="${yy}"/><text class="tick" x="${p.x0 - 6}" y="${yy + 4}"
      text-anchor="end">${Number(v.toPrecision(2))}</text>`;
  }
  s += `<text class="zl" x="${p.x1 - 6}" y="${p.top[0] + 14}"
    text-anchor="end">margin 1/‖w‖</text><text class="zl" x="${p.x1 - 6}"
    y="${p.bot[0] + 14}" text-anchor="end">support vectors</text>`;
  s += `<polyline class="c-line" points="${sw.map(r => `${sx(r.lc)},${
    yT(r.width)}`).join(" ")}"/><polyline class="c-line" points="${sw.map(r =>
    `${sx(r.lc)},${yB(r.nsv)}`).join(" ")}"/>`;
  s += `<line class="c-now" x1="${sx(soft.logC)}" x2="${sx(soft.logC)}"
    y1="${p.top[0]}" y2="${p.bot[1]}"/>`;
  s += `<text class="axis-label sm" x="${(p.x0 + p.x1) / 2}"
    y="${p.bot[1] + 32}" text-anchor="middle"><tspan
    class="sym">C</tspan> (log scale)</text>`;
  document.getElementById("s-sweep").innerHTML = s;
}

/** Round v up to 1, 2, 2.5 or 5 times a power of ten. */
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * e + 1e-12) return m * e;
}

function softSetC(lc) {
  soft.logC = clamp(Math.round(lc * 20) / 20, -2, 3);
  document.getElementById("s-c").value = soft.logC;
  document.getElementById("s-cval").textContent = fmtC(10 ** soft.logC);
  softSolve();
  softRender();
}

dragOn(sSvg, {
  down(h) {
    if (!h || h[0] !== "s") return false;
    soft.drag = { i: Number(h.slice(1)), moved: false };
    return true;
  },
  move(p) {
    const g = soft.drag;
    g.moved = true;
    soft.X[g.i] = clampPlane(p, 0.05);
    soft.hover = g.i;
    softSolve();
    softSweep();
    softRender();
  },
  up() {
    const g = soft.drag;
    soft.drag = null;
    if (g.moved) return;
    soft.y[g.i] *= -1;
    softSolve();
    softSweep();
    softRender();
  },
});

/** Hover a sample on the plot or the hinge chart (by data-i). */
function softHoverOn(el) {
  el.addEventListener("pointermove", e => {
    if (soft.drag) return;
    const t = e.target.closest("[data-i]");
    const i = t ? Number(t.dataset.i) : -1;
    if (i !== soft.hover) { soft.hover = i; softRender(); }
  });
  el.addEventListener("pointerleave", () => {
    if (soft.drag || soft.hover < 0) return;
    soft.hover = -1;
    softRender();
  });
}
softHoverOn(sSvg);
softHoverOn(document.getElementById("s-hinge"));

(function () {
  const el = document.getElementById("s-sweep");
  const set = e => {
    const q = svgPoint(el, e);
    softSetC((q.x - SWEEP.x0) / (SWEEP.x1 - SWEEP.x0) * 5 - 2);
  };
  el.addEventListener("pointerdown", e => {
    el.setPointerCapture(e.pointerId);
    set(e);
    const move = ev => set(ev);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", () => el.removeEventListener(
      "pointermove", move), { once: true });
  });
})();

function softNew() {
  softData();
  softSolve();
  softSweep();
  softRender();
}

const sC = document.getElementById("s-c");
sC.min = -2;
sC.max = 3;
sC.step = 0.05;
sC.oninput = () => softSetC(Number(sC.value));
const sSep = document.getElementById("s-sep");
sSep.min = 0;
sSep.max = 4;
sSep.step = 0.1;
sSep.value = soft.sep;
document.getElementById("s-sepval").textContent = fmt(soft.sep, 1);
sSep.oninput = () => {
  soft.sep = Number(sSep.value);
  document.getElementById("s-sepval").textContent = fmt(soft.sep, 1);
  softNew();
};
const sN = document.getElementById("s-n");
sN.min = 5;
sN.max = 40;
sN.value = soft.nPer;
document.getElementById("s-nval").textContent = `${soft.nPer} per class`;
sN.oninput = () => {
  soft.nPer = Number(sN.value);
  document.getElementById("s-nval").textContent = `${soft.nPer} per class`;
  softNew();
};
document.getElementById("s-resample").onclick = () => {
  soft.seed++;
  softNew();
};
document.getElementById("s-reset").onclick = () => {
  soft.X = soft.X0.map(x => x.slice());
  soft.y = soft.y0.slice();
  softSolve();
  softSweep();
  softRender();
};

function softShow() {
  if (!soft.fit) {
    softData();
    softSweep();
    softSetC(soft.logC);
  }
}
