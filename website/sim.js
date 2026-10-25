// In-browser re-implementation of the report's implicit diffusion step, used
// for the hero animation and the interactive staleness demo. It follows the
// same equations (backward-Euler step, Jacobi update (2), residual in
// difference form (4), check every M = 8 sweeps, tolerance 1e-5) but runs on
// the CPU in float64 on a small grid, so it illustrates the behaviour rather
// than reproducing GPU timings.

(function () {
  function makeProblem(N, source) {
    const u = new Float64Array(N * N);
    for (let j = 0; j < N; j++) u[j] = 100; // top edge = 100, others 0
    const f = new Float64Array(N * N);
    const c = (N - 1) / 2;
    if (source === "point") {
      f[Math.round(c) * N + Math.round(c)] = 1;
    } else {
      const s = N / 16;
      for (let i = 1; i < N - 1; i++)
        for (let j = 1; j < N - 1; j++)
          f[i * N + j] = Math.exp(-((i - c) ** 2 + (j - c) ** 2) / (2 * s * s));
    }
    return { N, u, f };
  }

  // ||b||_inf with b = u^n + dt*f + r * (fixed boundary neighbours)
  function bNorm(N, un, f, r) {
    let m = 0;
    for (let i = 1; i < N - 1; i++)
      for (let j = 1; j < N - 1; j++) {
        const k = i * N + j;
        let bd = 0;
        if (i === 1) bd += un[k - N];
        if (i === N - 2) bd += un[k + N];
        if (j === 1) bd += un[k - 1];
        if (j === N - 2) bd += un[k + 1];
        m = Math.max(m, Math.abs(un[k] + f[k] + r * bd));
      }
    return m || 1;
  }

  function residual(N, u, un, f, r, bn) {
    let m = 0;
    for (let i = 1; i < N - 1; i++)
      for (let j = 1; j < N - 1; j++) {
        const k = i * N + j;
        const c = u[k];
        const d = u[k - N] - c + (u[k + N] - c) + (u[k - 1] - c) + (u[k + 1] - c);
        const res = un[k] - c + f[k] + r * d;
        const a = Math.abs(res);
        if (a > m) m = a;
      }
    return m / bn;
  }

  function syncSweep(N, un, f, oldU, newU, r) {
    const den = 1 + 4 * r;
    for (let i = 1; i < N - 1; i++)
      for (let j = 1; j < N - 1; j++) {
        const k = i * N + j;
        newU[k] = (un[k] + r * (oldU[k - N] + oldU[k + N] + oldU[k - 1] + oldU[k + 1]) + f[k]) / den;
      }
  }

  // One block-asynchronous launch: every TX x TY tile copies itself plus a
  // one-cell halo from oldU (the halo stays frozen), sweeps D times locally,
  // then writes its interior to newU.
  function blockLaunch(N, un, f, oldU, newU, r, D, TX, TY, A, B) {
    const den = 1 + 4 * r;
    const W = TX + 2;
    for (let ti = 0; ti < N; ti += TY)
      for (let tj = 0; tj < N; tj += TX) {
        for (let li = 0; li < TY + 2; li++) {
          const gi = ti + li - 1;
          for (let lj = 0; lj < W; lj++) {
            const gj = tj + lj - 1;
            const v = gi >= 0 && gi < N && gj >= 0 && gj < N ? oldU[gi * N + gj] : 0;
            A[li * W + lj] = v;
            B[li * W + lj] = v;
          }
        }
        let a = A, b = B;
        for (let s = 0; s < D; s++) {
          for (let li = 1; li <= TY; li++) {
            const gi = ti + li - 1;
            if (gi <= 0 || gi >= N - 1) continue;
            for (let lj = 1; lj <= TX; lj++) {
              const gj = tj + lj - 1;
              if (gj <= 0 || gj >= N - 1) continue;
              const lc = li * W + lj;
              const k = gi * N + gj;
              b[lc] = (un[k] + r * (a[lc - W] + a[lc + W] + a[lc - 1] + a[lc + 1]) + f[k]) / den;
            }
          }
          const t = a; a = b; b = t;
        }
        for (let li = 1; li <= TY; li++) {
          const gi = ti + li - 1;
          if (gi <= 0 || gi >= N - 1) continue;
          for (let lj = 1; lj <= TX; lj++) {
            const gj = tj + lj - 1;
            if (gj <= 0 || gj >= N - 1) continue;
            newU[gi * N + gj] = a[li * W + lj];
          }
        }
      }
  }

  // Solve one implicit step from u^n. D = 0 means synchronous.
  function solveStep(prob, un, r, D, opts) {
    const { N, f } = prob;
    const M = 8, tol = 1e-5, maxSweeps = 40000;
    const TX = (opts && opts.TX) || 32, TY = (opts && opts.TY) || 8;
    let u = Float64Array.from(un);
    let v = Float64Array.from(un);
    const A = new Float64Array((TX + 2) * (TY + 2));
    const B = new Float64Array((TX + 2) * (TY + 2));
    const bn = bNorm(N, un, f, r);
    const trace = [[0, residual(N, u, un, f, r, bn)]];
    let sweeps = 0;
    while (sweeps < maxSweeps) {
      if (D === 0) {
        for (let s = 0; s < M; s++) { syncSweep(N, un, f, u, v, r); const t = u; u = v; v = t; }
      } else {
        for (let s = 0; s < M / D; s++) { blockLaunch(N, un, f, u, v, r, D, TX, TY, A, B); const t = u; u = v; v = t; }
      }
      sweeps += M;
      const rho = residual(N, u, un, f, r, bn);
      trace.push([sweeps, rho]);
      if (rho < tol) break;
    }
    return { u, sweeps, trace };
  }

  // Draws a W x H field onto a canvas at device resolution: bilinear-smoothed
  // grayscale with thin anti-aliased contour lines of constant screen width,
  // plus an optional 32x8 tile grid. map(u) must return 0..1.
  function render(cv, u, W, H, o) {
    const dpr = Math.min(o.maxDpr || 2, window.devicePixelRatio || 1);
    const rect = cv.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cv._img = null; }
    const ctx = cv.getContext("2d");
    if (!cv._img) cv._img = ctx.createImageData(cw, ch);
    const img = cv._img, d = img.data;

    const mv = cv._mv && cv._mv.length === W * H ? cv._mv : (cv._mv = new Float32Array(W * H));
    for (let k = 0; k < W * H; k++) mv[k] = o.map(u[k]);

    const n = o.levels || 12;
    const lineW = 0.9 * dpr;
    const sx = (W - 1) / cw, sy = (H - 1) / ch;
    let p = 0;
    for (let py = 0; py < ch; py++) {
      const fy = (py + 0.5) * sy;
      const iy = Math.min(H - 2, fy | 0), ty = fy - iy;
      for (let px = 0; px < cw; px++) {
        const fx = (px + 0.5) * sx;
        const ix = Math.min(W - 2, fx | 0), tx = fx - ix;
        const k = iy * W + ix;
        const a = mv[k], b = mv[k + 1], c = mv[k + W], e = mv[k + W + 1];
        const v = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
        // screen-space gradient of v, for constant-width lines
        const gx = ((b - a) * (1 - ty) + (e - c) * ty) * sx;
        const gy = ((c - a) * (1 - tx) + (e - b) * tx) * sy;
        const g = Math.sqrt(gx * gx + gy * gy) * n;
        const t = v * n;
        const r = Math.round(t);
        let line = 0;
        if (r > 0 && g > 1e-6) line = Math.max(0, 1 - Math.abs(t - r) / g / lineW);
        let gray = 10 + 200 * v;
        gray += (255 - gray) * line * 0.55;
        d[p] = d[p + 1] = d[p + 2] = gray;
        d[p + 3] = 255;
        p += 4;
      }
    }
    ctx.putImageData(img, 0, 0);

    if (o.grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 32; j < W; j += 32) { const x = Math.round((j / W) * cw) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
      for (let i = 8; i < H; i += 8) { const y = Math.round((i / H) * ch) + 0.5; ctx.moveTo(0, y); ctx.lineTo(cw, y); }
      ctx.stroke();
    }
  }

  window.Sim = { makeProblem, solveStep, syncSweep, render };
})();
