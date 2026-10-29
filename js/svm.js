// Linear SVM solver. Decision rule y_hat = sign(w·x + b), as in sklearn
// (intercept_ is b).

/**
 * Fit a soft-margin linear SVM by SMO on the dual (Platt 1998), each step
 * updating the maximal violating pair (Keerthi et al. 2001), with the
 * pair update and offset of LIBSVM (Chang & Lin 2011).
 *
 * The dual: max sum(alpha) - 1/2 sum_ij alpha_i alpha_j y_i y_j x_i·x_j
 * subject to 0 <= alpha_i <= C and sum(alpha_i y_i) = 0. A large C
 * (1e5 here) stands in for the hard margin.
 *
 * Args:
 *   X (Array): (n, 2) features
 *   y (Array): (n,) labels in {-1, +1}
 *   C (number): price per unit of slack
 *   init (Array | null): (n,) feasible starting alpha (a warm start),
 *     e.g. the solution at a smaller C
 *
 * Returns:
 *   {w, b, alpha, f, xi}: w (2,), offset b, alpha (n,) dual weights,
 *     f (n,) scores w·x_i + b, xi (n,) slacks max(0, 1 - y_i f_i)
 */
function fitSvm(X, y, C, init = null, tol = 1e-6, maxIter = 200000) {
  const n = X.length;
  const K = X.map(a => X.map(c => dot(a, c)));
  const a = new Float64Array(n);
  // Gradient of the minimized dual 1/2 a'Qa - sum(a), Q_ij = y_i y_j K_ij.
  const G = new Float64Array(n).fill(-1);
  if (init) {
    for (let t = 0; t < n; t++) a[t] = init[t];
    for (let t = 0; t < n; t++) {
      for (let r = 0; r < n; r++) G[t] += y[t] * y[r] * K[t][r] * a[r];
    }
  }
  const up = t => (y[t] === 1 ? a[t] < C : a[t] > 0);
  const low = t => (y[t] === 1 ? a[t] > 0 : a[t] < C);
  for (let it = 0; it < maxIter; it++) {
    let i = -1, j = -1, gmax = -Infinity, gmin = Infinity;
    for (let t = 0; t < n; t++) {
      const v = -y[t] * G[t];
      if (up(t) && v > gmax) { gmax = v; i = t; }
      if (low(t) && v < gmin) { gmin = v; j = t; }
    }
    if (i < 0 || j < 0 || gmax - gmin < tol) break;
    const ai = a[i], aj = a[j];
    const Qij = y[i] * y[j] * K[i][j];
    if (y[i] !== y[j]) {
      const quad = Math.max(K[i][i] + K[j][j] + 2 * Qij, 1e-12);
      const delta = (-G[i] - G[j]) / quad, diff = ai - aj;
      a[i] += delta;
      a[j] += delta;
      if (diff > 0) { if (a[j] < 0) { a[j] = 0; a[i] = diff; } }
      else if (a[i] < 0) { a[i] = 0; a[j] = -diff; }
      if (diff > 0) { if (a[i] > C) { a[i] = C; a[j] = C - diff; } }
      else if (a[j] > C) { a[j] = C; a[i] = C + diff; }
    } else {
      const quad = Math.max(K[i][i] + K[j][j] - 2 * Qij, 1e-12);
      const delta = (G[i] - G[j]) / quad, sum = ai + aj;
      a[i] -= delta;
      a[j] += delta;
      if (sum > C) { if (a[i] > C) { a[i] = C; a[j] = sum - C; } }
      else if (a[j] < 0) { a[j] = 0; a[i] = sum; }
      if (sum > C) { if (a[j] > C) { a[j] = C; a[i] = sum - C; } }
      else if (a[i] < 0) { a[i] = 0; a[j] = sum; }
    }
    const di = a[i] - ai, dj = a[j] - aj;
    for (let t = 0; t < n; t++) {
      G[t] += y[t] * (y[i] * K[t][i] * di + y[j] * K[t][j] * dj);
    }
  }

  // Offset: LIBSVM's rho (decision w·x - rho) averaged over free alphas
  // (on the margin), else the midpoint of the feasible interval; b = -rho.
  let nFree = 0, sumFree = 0, ub = Infinity, lb = -Infinity;
  for (let t = 0; t < n; t++) {
    const yG = y[t] * G[t];
    if (a[t] >= C) {
      if (y[t] === -1) ub = Math.min(ub, yG); else lb = Math.max(lb, yG);
    } else if (a[t] <= 0) {
      if (y[t] === 1) ub = Math.min(ub, yG); else lb = Math.max(lb, yG);
    } else { nFree++; sumFree += yG; }
  }
  const b = -(nFree ? sumFree / nFree : (ub + lb) / 2);

  const w = [0, 0];
  for (let t = 0; t < n; t++) {
    w[0] += a[t] * y[t] * X[t][0];
    w[1] += a[t] * y[t] * X[t][1];
  }
  const f = X.map(x => dot(w, x) + b);
  const xi = f.map((v, t) => Math.max(0, 1 - y[t] * v));
  return { w, b, alpha: Array.from(a), f, xi, C };
}

/** Indices of the support vectors (alpha above round-off). */
function supportOf(fit) {
  const eps = 1e-7 * Math.max(1, Math.max(...fit.alpha));
  return fit.alpha.map((v, i) => (v > eps ? i : -1)).filter(i => i >= 0);
}
