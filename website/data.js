// All numbers below come from the final report ("Separating the Effects of
// Synchronization Relaxation and Temporal Locality in GPU Iterative Stencil
// Solvers"). Values marked "read from figure" were taken off the plotted
// figures and are approximate; everything else is copied from the tables/text.

window.DATA = {
  // Table IV: speedup over synchronous Jacobi (median of 3), N <= 1024 (in L2)
  tableIV: {
    cols: ["D1", "D2", "D4", "D8", "G-asc", "G-desc", "G-fb"],
    rows: [
      [512, "Gaussian", 1, [0.602, 0.754, 0.684, 0.569, 0.593, 0.697, 0.647], 2.73],
      [512, "Gaussian", 10, [0.579, 0.718, 0.79, 0.757, 0.696, 0.746, 0.767], 1.86],
      [512, "Gaussian", 100, [0.485, 0.726, 0.776, 0.775, 0.738, 0.674, 0.78], 1.78],
      [512, "point", 1, [0.692, 0.844, 0.781, 0.547, 0.64, 0.789, 0.742], 2.66],
      [512, "point", 10, [0.644, 0.868, 0.908, 0.716, 0.761, 0.867, 0.832], 1.86],
      [512, "point", 100, [0.51, 0.74, 0.792, 0.799, 0.747, 0.697, 0.822], 1.78],
      [1024, "Gaussian", 1, [0.528, 0.73, 0.739, 0.532, 0.576, 0.695, 0.663], 2.73],
      [1024, "Gaussian", 10, [0.488, 0.635, 0.866, 0.719, 0.665, 0.643, 0.752], 1.86],
      [1024, "Gaussian", 100, [0.588, 0.931, 1.05, 0.985, 0.94, 0.831, 1.072], 1.78],
      [1024, "point", 1, [0.562, 0.722, 0.701, 0.501, 0.56, 0.684, 0.642], 2.66],
      [1024, "point", 10, [0.492, 0.738, 0.826, 0.684, 0.673, 0.672, 0.688], 1.86],
      [1024, "point", 100, [0.677, 0.878, 1.019, 0.999, 0.983, 0.831, 0.997], 1.78],
    ],
  },

  // Fig. 2: sweeps relative to sync (32x8 tiles). D1 exact; D8 from Table IV
  // s(D8); D2 and D4 read from figure.
  sweepRatio: {
    cats: ["D1", "D2", "D4", "D8"],
    series: [
      { key: "r1", name: "r = 1", values: [1.0, 1.14, 1.59, 2.7] },
      { key: "r10", name: "r = 10", values: [1.0, 1.12, 1.35, 1.86] },
      { key: "r100", name: "r = 100", values: [1.0, 1.13, 1.35, 1.78] },
    ],
  },

  // Fig. 3: convergence-check interval M (Gaussian, in cache). End points
  // exact from text; interior points read from figure.
  checkInterval: {
    M: [8, 32, 128, 1024],
    cost: [
      { name: "N = 512", values: [8.07, 5.0, 4.6, 4.46] },
      { name: "N = 1024", values: [21.1, 17.2, 15.6, 16.0] },
    ],
    d8: [
      { name: "N = 512", values: [0.78, 0.87, 0.97, 1.79] },
      { name: "N = 1024", values: [0.71, 0.85, 1.28, 1.72] },
    ],
  },

  // Fig. 4: effective bandwidth of fused sync kernel (read from figure;
  // N=4096 r=1 = 221 GB/s and the 253-291 band are from the text).
  bandwidth: {
    N: [1024, 2048, 4096, 8192, 16384, 18432],
    series: [
      { name: "r = 1", values: [580, 278, 221, 270, 255, 262] },
      { name: "r = 10", values: [620, 288, 287, 288, 266, 282] },
      { name: "r = 100", values: [640, 290, 291, 290, null, null] },
    ],
  },

  // Table V: best config per family while in cache (Gaussian, 5 repeats)
  tableV: [
    [512, 1, "2.82 (B)", "D4@32×16 (B)", 3.62, 0.778],
    [512, 10, "16.41 (O)", "D4@32×16 (B)", 17.96, 0.914],
    [512, 100, "95.40 (O)", "D8@32×16 (O)", 100.82, 0.946],
    [1024, 1, "8.11 (B)", "D2@32×8 (B)", 10.64, 0.762],
    [1024, 10, "48.50 (B)", "D4@32×8 (O)", 54.83, 0.885],
    [1024, 100, "298.28 (O)", "D4@32×8 (O)", 333.32, 0.895],
  ],

  // Table VI: speedup from fusing the right-hand side (T_unfused / T_fused)
  tableVI: [
    [1024, 1.034, 1.063, 1.071, 0.998, 1.022],
    [2048, 1.172, 1.215, 1.204, 0.921, 1.048],
    [4096, 1.244, 1.229, 1.223, 1.019, 1.04],
    [8192, 1.174, 1.211, 1.218, 1.035, 1.036],
    [16384, 1.171, 1.202, null, 1.035, 1.029],
  ],

  // Table VII: out-of-cache comparison vs fused sync (best config of each family)
  tableVII: {
    N: [1024, 2048, 4096, 8192, 16384, 18432],
    tb: {
      1: [0.701, 1.352, 1.724, 1.316, 1.385, 1.33],
      10: [0.689, 1.376, 1.321, 1.32, 1.416, 1.358],
      100: [0.674, 1.284, 1.303, 1.325, null, null],
    },
    ba: {
      1: [0.603, 1.122, 1.441, 1.073, 1.144, 1.108],
      10: [0.812, 1.548, 1.452, 1.462, 1.581, 1.527],
      100: [0.799, 1.438, 1.469, 1.477, null, null],
    },
    batb: {
      1: [0.86, 0.83, 0.836, 0.815, 0.827, 0.833],
      10: [1.179, 1.125, 1.099, 1.107, 1.116, 1.124],
      100: [1.185, 1.12, 1.127, 1.114, null, null],
    },
  },

  // Table VIII: per-sweep cost c, sweep ratio s, speedup S at r = 10
  // [config, family, c1024, S1024, c8192, s, S8192]; s at N=1024 equals s at 8192
  tableVIII: [
    ["D4@32×32", "BA", 1.072, 0.812, 0.59, 1.16, 1.462],
    ["D4@64×32", "BA", 1.072, 0.812, 0.62, 1.16, 1.391],
    ["D4@64×64", "BA", 2.132, 0.408, 1.301, 1.16, 0.663],
    ["D8@32×16", "BA", 0.753, 0.764, 0.418, 1.738, 1.377],
    ["D8@32×32", "BA", 0.917, 0.727, 0.473, 1.525, 1.386],
    ["D8@64×32", "BA", 0.906, 0.736, 0.478, 1.525, 1.373],
    ["D8@64×64", "BA", 1.682, 0.396, 0.919, 1.525, 0.714],
    ["T2@32×32", "TB", 1.56, 0.641, 0.911, 1.0, 1.097],
    ["T2@64×32", "TB", 1.562, 0.64, 0.977, 1.0, 1.024],
    ["T2@64×64", "TB", 3.219, 0.311, 2.15, 1.0, 0.465],
    ["T4@32×32", "TB", 1.452, 0.689, 0.757, 1.0, 1.32],
    ["T4@64×32", "TB", 1.673, 0.598, 0.901, 1.0, 1.109],
    ["T4@64×64", "TB", 2.512, 0.398, 1.476, 1.0, 0.677],
    ["T8@32×32", "TB", 1.661, 0.602, 0.828, 1.0, 1.207],
    ["T8@64×32", "TB", 1.539, 0.65, 0.778, 1.0, 1.286],
    ["T8@64×64", "TB", 2.246, 0.445, 1.183, 1.0, 0.846],
  ],

  // Table IX: advantage of block-async out of cache as comparison got fairer
  tableIX: [
    { step: "Original synchronous kernel (first run)", r1: [1.33, 1.56], r10: [1.68, 1.76] },
    { step: "Sync kernel with fused right-hand side", r1: [1.07, 1.44], r10: [1.44, 1.58] },
    { step: "Exact temporal blocking, best vs. best", r1: [0.82, 0.84], r10: [1.1, 1.13] },
    { step: "Exact temporal blocking, same tile and D", r1: [0.82, 0.84], r10: [1.02, 1.13] },
  ],

  // Table X: guided policies, total time over 12 configs
  tableX: [
    { name: "G-asc", rule: "D: 1→8 by residual", best: 18.5, sync: 15.8 },
    { name: "G-desc", rule: "D: 8→1 by residual", best: 31.2, sync: 28.2 },
    { name: "G-fb", rule: "feedback, starts at D=1", best: 10.0, sync: 7.5 },
  ],

  // Table XI: selector on the extension dataset (16 configurations)
  tableXI: [
    { name: "Always synchronous", acc: "–", slow: 37.9 },
    { name: "Always temporal blocking", acc: "–", slow: 14.3 },
    { name: "Always block-asynchronous", acc: "–", slow: 13.6 },
    { name: "Tree, leave-one-config-out", acc: "14/16", slow: 4.9, hi: true },
    { name: "Tree, leave-one-grid-size-out", acc: "10/16", slow: 14.1 },
  ],
};
