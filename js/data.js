// Seeded toy data: two Gaussian blobs in the plane with labels -1, +1.

/** Seeded PRNG (mulberry32) so a draw can be replayed. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller). */
function gauss(r) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

/**
 * Draw nPer samples per class, the class means sep apart along a tilted
 * direction, each blob wider across that direction than along it.
 *
 * Returns:
 *   {X, y}: X (n, 2) features, y (n,) labels in {-1, +1}, n = 2 nPer
 */
function makeBlobs(nPer, sep, sd, seed) {
  const r = rng(seed), a = 0.6, u = [Math.cos(a), Math.sin(a)];
  const v = perp(u), X = [], y = [];
  for (const c of [-1, 1]) {
    for (let i = 0; i < nPer; i++) {
      const s = c * sep / 2 + sd * gauss(r), t = 1.6 * sd * gauss(r);
      X.push([clamp(s * u[0] + t * v[0], -2.9, 2.9),
        clamp(s * u[1] + t * v[1], -2.9, 2.9)]);
      y.push(c);
    }
  }
  return { X, y };
}
