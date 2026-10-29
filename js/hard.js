// Hard-margin tab: the reader's own separating line, with every sample's
// distance to it and the street out to the nearest sample, against the
// widest line (C = 1e5 stands in for the hard margin), its support
// vectors and w = sum_i alpha_i y_i x_i drawn head to tail.

const HARD_C = 1e5;
const hard = {
  nPer: 10, seed: 3, X: [], y: [], X0: [], y0: [], P: [0, 0], Q: [1, 0],
  fit: null, sep: true, showBest: false, drag: null,
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

/**
 * The reader's line through handles P and Q, w of unit length, turned to
 * whichever side gets more samples right (then the larger margin).
 *
 * Returns:
 *   {w, b, r, i0, m}: r (n,) signed distances y_i (w·x_i - b), i0 the
 *     nearest sample (smallest r), m = r[i0] the margin
 */
function hardUser() {
  const d = sub(hard.Q, hard.P);
  const best = { score: -Infinity };
  for (const sg of [1, -1]) {
    const w = mul(perp(d), sg / norm(d)), b = dot(w, hard.P);
    const r = hard.X.map((x, i) => hard.y[i] * (dot(w, x) - b));
    const m = Math.min(...r);
    const score = r.filter(v => v > 0).length + 1e-3 * Math.tanh(m);
    if (score > best.score) {
      Object.assign(best, { score, w, b, r, m, i0: r.indexOf(m) });
    }
  }
  return best;
}

/** Start the reader on a separating line that is not the widest one. */
function hardInitLine() {
  const { w, b } = hard.fit, n = norm(w), u = mul(w, 1 / n);
  const mean = mul(hard.X.reduce(add, [0, 0]), 1 / hard.X.length);
  const c0 = sub(mean, mul(u, (dot(w, mean) - b) / n));
  for (const deg of [28, 22, 16, 10, 5, 0]) {
    const t = deg * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
    const ur = [cs * u[0] - sn * u[1], sn * u[0] + cs * u[1]];
    const c = add(c0, mul(u, 0.35 / n)), dr = perp(ur);
    hard.P = add(c, mul(dr, -1.7));
    hard.Q = add(c, mul(dr, 1.7));
    if (hardUser().m > 0) return;
  }
}

/** A street of half-width h around w·x = b, clipped to the plot. */
function streetSvg(w, b, h, cls) {
  return lineSvg(w, b, `class="${cls}" stroke-width="${2 * h * S.k /
    norm(w)}" clip-path="url(#h-clip)"`);
}

function hardRender() {
  const { X, y } = hard, U = hardUser(), fit = hard.fit;
  const best = hard.showBest && hard.sep;
  let s = `<defs><clipPath id="h-clip"><rect x="${PLANE.x0}"
    y="${PLANE.y0}" width="${PLANE.x1 - PLANE.x0}"
    height="${PLANE.y1 - PLANE.y0}"/></clipPath></defs>` + axesSvg();

  if (best) {
    s += streetSvg(fit.w, fit.b, 1, "band best");
    s += lineSvg(fit.w, fit.b + 1, 'class="edge best"');
    s += lineSvg(fit.w, fit.b - 1, 'class="edge best"');
  }
  if (U.m > 0) {
    s += streetSvg(U.w, U.b, U.m, "band you");
    s += lineSvg(U.w, U.b + U.m, 'class="edge you"');
    s += lineSvg(U.w, U.b - U.m, 'class="edge you"');
  }
  for (let i = 0; i < X.length; i++) {
    const foot = sub(X[i], mul(U.w, dot(U.w, X[i]) - U.b));
    const cls = U.r[i] < 0 ? "stick wrong" : i === U.i0 ? "stick near" :
      "stick";
    s += segSvg(X[i], foot, `class="${cls}"`);
  }
  if (best) s += lineSvg(fit.w, fit.b, 'class="bound best"');
  s += lineSvg(U.w, U.b, 'class="bound"');

  const xn = X[U.i0], fn = sub(xn, mul(U.w, dot(U.w, xn) - U.b));
  const mid = mul(add(xn, fn), 0.5);
  let top = `<text class="lbl ${U.m > 0 ? "green" : "red"}"
    x="${S.sx(mid[0]) + 10}" y="${S.sy(mid[1]) - 10}">${fmt(U.m)}</text>`;
  if (best) {
    hard.sv.forEach((i, k) => {
      top += `<circle class="sv" cx="${S.sx(X[i][0])}" cy="${S.sy(X[i][1])}"
        r="14"/><text class="lbl violet" x="${S.sx(X[i][0]) + 15}"
        y="${S.sy(X[i][1]) + 20}">${k + 1}</text>`;
    });
  }
  s += samplesSvg(X, y);
  for (const [h, p] of [["P", hard.P], ["Q", hard.Q]]) {
    top += `<rect class="handle" data-h="${h}" x="${S.sx(p[0]) - 8}"
      y="${S.sy(p[1]) - 8}" width="16" height="16" rx="2"/>`;
  }
  hSvg.innerHTML = s + top;
  hardReadout(U);
}

function hardReadout(U) {
  const fit = hard.fit, n = norm(fit.w), wrong = U.r.filter(v => v < 0);
  const row = (k, v) => `<div class="row"><span>${k}</span>
    <span class="val">${v}</span></div>`;
  let h = `<h3>Your line</h3>` +
    row("<b>w</b> (‖<b>w</b>‖ = 1), <i>b</i>", `${fvec(U.w)}, ${fmt(U.b)}`) +
    row(`margin = min<sub><i>i</i></sub> ${YF}`,
      `<span class="${U.m > 0 ? "good" : "bad"}">${fmt(U.m)}</span>`);
  if (wrong.length) {
    h += `<p class="warn">${wrong.length} sample${wrong.length > 1 ? "s" :
      ""} on the wrong side, so the margin is negative.</p>`;
  }
  if (!hard.sep) {
    h += `<p class="warn">These samples are not separable: no line gets
      every one right, so there is no hard-margin solution. Drag or flip a
      sample back, or see the Soft margin tab.</p>`;
  } else if (hard.showBest) {
    h += `<h3>Widest line</h3>` +
      row("<b>w</b>, <i>b</i>", `${fvec(fit.w)}, ${fmt(fit.b)}`) +
      row("‖<b>w</b>‖", fmt(n)) +
      row("margin 1 / ‖<b>w</b>‖", `<span class="good">${fmt(1 / n)}
        </span>`) +
      row("yours, as a share of it", `${Math.round(100 * Math.max(U.m, 0) *
        n)}%`) +
      row("support vectors", hard.sv.length);
  }
  document.getElementById("h-read").innerHTML = h;
  document.getElementById("h-sum-card").hidden = !(hard.showBest &&
    hard.sep);
  if (hard.showBest && hard.sep) hardSum();
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
  down(h, p) {
    if (h && h[0] === "s") {
      hard.drag = { kind: "s", i: Number(h.slice(1)), moved: false };
    } else if (h === "P" || h === "Q") {
      hard.drag = { kind: h };
    } else {
      hard.drag = { kind: "shift", p0: p, P0: hard.P, Q0: hard.Q };
    }
    return true;
  },
  move(p) {
    const g = hard.drag, q = [clamp(p[0], -2.95, 2.95),
      clamp(p[1], -2.95, 2.95)];
    if (g.kind === "s") {
      g.moved = true;
      hard.X[g.i] = q;
      hardSolve();
    } else if (g.kind === "P" || g.kind === "Q") {
      const other = g.kind === "P" ? hard.Q : hard.P;
      if (norm(sub(q, other)) < 0.3) return;
      hard[g.kind] = q;
    } else {
      const dlt = sub(p, g.p0);
      hard.P = add(g.P0, dlt);
      hard.Q = add(g.Q0, dlt);
    }
    hardRender();
  },
  up() {
    const g = hard.drag;
    if (g.kind === "s" && !g.moved) {
      hard.y[g.i] *= -1;
      hardSolve();
      hardRender();
    }
    hard.drag = null;
  },
});

function hardNew() {
  hardData();
  hardSolve();
  hardInitLine();
  hardRender();
}

document.getElementById("h-best").onchange = e => {
  hard.showBest = e.target.checked;
  hardRender();
};
document.getElementById("h-snap").onclick = () => {
  if (!hard.sep) return;
  const { w, b } = hard.fit, d = perp(w), F = footOrigin(w, b);
  const mean = mul(hard.X.reduce(add, [0, 0]), 1 / hard.X.length);
  const c0 = add(F, mul(d, dot(sub(mean, F), d) / dot(d, d)));
  hard.P = add(c0, mul(d, -1.7 / norm(d)));
  hard.Q = add(c0, mul(d, 1.7 / norm(d)));
  hardRender();
};
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
