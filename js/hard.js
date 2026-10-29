// Hard-margin tab: the widest separating line (C = 1e5 stands in for the
// hard margin), its street, its support vectors with their alphas, and
// w = sum_i alpha_i y_i x_i drawn head to tail. Samples can be dragged
// or flipped; the fit follows.

const HARD_C = 1e5;
const hard = {
  nPer: 10, seed: 3, X: [], y: [], X0: [], y0: [], fit: null, sep: true,
  drag: null,
};
const hSvg = planeSvg("h-stage");
// HTML for x_i and for y_i (w·x_i - b).
const XI = "<b>x</b><sub><i>i</i></sub>";
const YF = `<i>y<sub>i</sub></i>(<b>w</b>·${XI} &minus; <i>b</i>)`;

function hardData() {
  const d = makeBlobs(hard.nPer, 3.4, 0.5, hard.seed);
  hard.X = d.X;
  hard.y = d.y;
  hard.X0 = d.X.map(x => x.slice());
  hard.y0 = d.y.slice();
}

function hardSolve() {
  hard.fit = fitSvm(hard.X, hard.y, HARD_C);
  hard.sep = Math.max(...hard.fit.xi) < 1e-3;
  hard.sv = supportOf(hard.fit);
}

function hardRender() {
  const { X, y } = hard, { w, b } = hard.fit, n = norm(w);
  let s = `<defs><clipPath id="h-clip"><rect x="${PLANE.x0}"
    y="${PLANE.y0}" width="${PLANE.x1 - PLANE.x0}"
    height="${PLANE.y1 - PLANE.y0}"/></clipPath></defs>` + axesSvg();
  let top = "";
  if (hard.sep) {
    s += lineSvg(w, b, `class="band" stroke-width="${2 * S.k / n}"
      clip-path="url(#h-clip)"`);
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
    top += `<text class="lbl green" x="${gx}" y="${gy}">1/‖<tspan
      class="vec">w</tspan>‖ = ${fmt(1 / n)}</text>`;

    hard.sv.forEach((i, k) => {
      top += `<circle class="ring" cx="${S.sx(X[i][0])}"
        cy="${S.sy(X[i][1])}" r="13"/><text class="lbl ink"
        x="${S.sx(X[i][0]) + 15}" y="${S.sy(X[i][1]) + 20}">${k + 1}</text>`;
    });
  }
  hSvg.innerHTML = s + samplesSvg(X, y) + top;
  hardReadout();
}

function hardReadout() {
  const fit = hard.fit, n = norm(fit.w);
  const row = (k, v) => `<div class="row"><span>${k}</span>
    <span class="val">${v}</span></div>`;
  document.getElementById("h-read").innerHTML = hard.sep
    ? row("<b>w</b>, <i>b</i>", `${fvec(fit.w)}, ${fmt(fit.b)}`) +
      row("‖<b>w</b>‖", fmt(n)) +
      row("margin 1 / ‖<b>w</b>‖", `<span class="good">${fmt(1 / n)}</span>`) +
      row("support vectors", hard.sv.length)
    : `<p class="warn">These samples are not separable: no line gets every
      one right, so there is no hard-margin solution. Drag or flip a sample
      back, or see the Soft margin tab.</p>`;
  document.getElementById("h-sum-card").hidden = !hard.sep;
  if (hard.sep) hardSum();
}

/** Head-to-tail sum alpha_i y_i x_i over the support vectors, and table. */
function hardSum() {
  const { X, y } = hard, fit = hard.fit, sv = hard.sv;
  const terms = sv.map(i => mul(X[i], fit.alpha[i] * y[i]));
  const pts = [[0, 0]];
  for (const t of terms) pts.push(add(pts[pts.length - 1], t));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const lo = [Math.min(...xs), Math.min(...ys)];
  const hi = [Math.max(...xs), Math.max(...ys)];
  const box = { w: 340, h: 260, pad: 26 };
  const k = Math.min((box.w - 2 * box.pad) / Math.max(hi[0] - lo[0], 1e-9),
    (box.h - 2 * box.pad) / Math.max(hi[1] - lo[1], 1e-9));
  const ox = box.w / 2 - k * (lo[0] + hi[0]) / 2;
  const oy = box.h / 2 + k * (lo[1] + hi[1]) / 2;
  const s2 = { sx: v => ox + k * v, sy: v => oy - k * v };
  let s = `<line class="grid zero" x1="0" x2="${box.w}" y1="${oy}"
    y2="${oy}"/><line class="grid zero" x1="${ox}" x2="${ox}" y1="0"
    y2="${box.h}"/>`;
  s += arrowSvg([0, 0], fit.w, "w thick", s2, 15);
  terms.forEach((t, j) => {
    const a = pts[j], c = pts[j + 1], m = mul(add(a, c), 0.5);
    s += arrowSvg(a, c, y[sv[j]] > 0 ? "pos" : "neg", s2, 10);
    s += `<text class="lbl small" x="${s2.sx(m[0]) + 6}"
      y="${s2.sy(m[1]) - 6}">${j + 1}</text>`;
  });
  s += `<text class="lbl violet" x="${s2.sx(fit.w[0]) + 8}"
    y="${s2.sy(fit.w[1]) + 4}"><tspan class="vec">w</tspan></text>`;
  document.getElementById("h-sum").innerHTML = s;

  let t = `<table class="alpha"><tr><th>#</th><th><i>y<sub>i</sub></i></th>
    <th><i>α<sub>i</sub></i></th><th><i>α<sub>i</sub>y<sub>i</sub></i>${
    XI}</th><th>${YF}</th></tr>`;
  sv.forEach((i, j) => {
    t += `<tr><td>${j + 1}</td><td>${classDot(y[i])}${y[i] > 0 ? "+1" :
      "&minus;1"}</td><td>${fmt(fit.alpha[i], 3)}</td>
      <td>${fvec(terms[j])}</td><td>${fmt(y[i] * fit.f[i])}</td></tr>`;
  });
  const sumAy = sv.reduce((acc, i) => acc + fit.alpha[i] * y[i], 0);
  t += `</table><p class="calc">&sum; <i>α<sub>i</sub>y<sub>i</sub></i> =
    ${fmt(Math.abs(sumAy) < 5e-3 ? 0 : sumAy, 2)} &nbsp;&middot;&nbsp;
    &sum; <i>α<sub>i</sub>y<sub>i</sub></i><b>x</b><sub><i>i</i></sub> =
    ${fvec(fit.w)} = <b>w</b></p>`;
  document.getElementById("h-alpha").innerHTML = t;
}

dragOn(hSvg, {
  down(h) {
    if (!h || h[0] !== "s") return false;
    hard.drag = { i: Number(h.slice(1)), moved: false };
    return true;
  },
  move(p) {
    const g = hard.drag;
    g.moved = true;
    hard.X[g.i] = [clamp(p[0], -2.95, 2.95), clamp(p[1], -2.95, 2.95)];
    hardSolve();
    hardRender();
  },
  up() {
    const g = hard.drag;
    hard.drag = null;
    if (g.moved) return;
    hard.y[g.i] *= -1;
    hardSolve();
    hardRender();
  },
});

function hardNew() {
  hardData();
  hardSolve();
  hardRender();
}

document.getElementById("h-resample").onclick = () => {
  hard.seed++;
  hardNew();
};
document.getElementById("h-reset").onclick = () => {
  hard.X = hard.X0.map(x => x.slice());
  hard.y = hard.y0.slice();
  hardSolve();
  hardRender();
};
const hN = document.getElementById("h-n");
hN.min = 3;
hN.max = 25;
hN.value = hard.nPer;
document.getElementById("h-nval").textContent = `${hard.nPer} per class`;
hN.oninput = () => {
  hard.nPer = Number(hN.value);
  document.getElementById("h-nval").textContent = `${hard.nPer} per class`;
  hardNew();
};

function hardShow() {
  if (!hard.fit) hardNew();
}
