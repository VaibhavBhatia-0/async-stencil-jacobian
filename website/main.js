(function () {
  const D = window.DATA;
  const C = window.Charts;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- smooth scroll ----------
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
  } else {
    document.documentElement.style.scrollBehavior = "smooth";
  }

  function goTo(hash) {
    const t = hash === "#top" ? 0 : $(hash);
    if (t === null) return;
    if (lenis) lenis.scrollTo(t, { duration: 1.6 });
    else if (t === 0) scrollTo(0, 0);
    else t.scrollIntoView();
  }
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const h = a.getAttribute("href");
      if (h.length < 2) return;
      e.preventDefault();
      closeMenu();
      goTo(h);
    })
  );

  // ---------- menu ----------
  const menu = $("#menu");
  const menuBtn = $(".nav .menu-btn");
  function openMenu() {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!menu.classList.contains("open")) return;
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    if (lenis) lenis.start();
  }
  menuBtn.addEventListener("click", openMenu);
  $(".menu-close").addEventListener("click", closeMenu);
  addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  // ---------- reveal ----------
  const rio = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".rv, .split, .rule, .clip, .about-grid > div").forEach((n) => rio.observe(n));

  // count-up numbers
  const cio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const n = e.target;
        const to = parseFloat(n.dataset.count);
        const dec = parseInt(n.dataset.dec || "0", 10);
        if (reduced) return;
        const t0 = performance.now();
        const dur = 1600;
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const k = 1 - Math.pow(1 - p, 4);
          n.textContent = (to * k).toFixed(dec);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    { threshold: 0.6 }
  );
  $$("[data-count]").forEach((n) => cio.observe(n));

  // active nav link
  const links = $$(".nav-links a");
  const nio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id === "about" || e.target.id === "top" ? "top" : e.target.id;
        const map = { beyond: "results", optimism: "results" };
        const key = "#" + (map[id] || id);
        links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === key));
      }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["about", "problem", "method", "results", "beyond", "optimism", "selector", "conclusion"].forEach((id) => {
    const n = document.getElementById(id);
    if (n) nio.observe(n);
  });

  // ---------- per-frame scroll effects ----------
  const progress = $(".progress");
  const giants = $$("[data-parallax]");
  const hs = $(".hscroll");
  const hsTrack = $(".hscroll-track");
  const mqTrack = $(".marquee-track");
  let mqX = 0;
  let lastY = scrollY;

  function frame(time) {
    if (lenis) lenis.raf(time);
    const y = scrollY;
    const vel = lenis ? lenis.velocity : y - lastY;
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduced) {
      for (const g of giants) {
        const r = g.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        const k = parseFloat(g.dataset.parallax);
        g.style.transform = `translate3d(${(r.top - innerHeight / 2) * k}px,0,0)`;
      }
      // marquee drifts and speeds up with scroll velocity
      const half = mqTrack.scrollWidth / 2;
      mqX -= 0.6 + Math.min(Math.abs(vel) * 0.35, 18);
      if (half > 0 && -mqX >= half) mqX += half;
      mqTrack.style.transform = `translate3d(${mqX}px,0,0)`;
    }

    if (hsDist > 0) {
      const r = hs.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / hsDist));
      hsTrack.style.transform = `translate3d(${-p * hsDist}px,0,0)`;
      hsBar.style.transform = `scaleX(${p})`;
      const n = Math.min(hsCards, 1 + Math.floor(p * hsCards));
      hsCount.textContent = `0${n} / 0${hsCards}`;
    }
    requestAnimationFrame(frame);
  }

  // The method cards pin and slide sideways only when they fit the window
  // height; otherwise they stay a plain grid. Vertical scroll distance equals
  // the horizontal distance, so the slide tracks the wheel 1:1.
  const hsBar = $(".hscroll-bar b");
  const hsCount = $(".hscroll-count");
  const hsCards = $$(".card", hsTrack).length;
  let hsDist = 0;
  function layoutMethod() {
    hs.classList.remove("pinned");
    hs.style.height = "";
    hsTrack.style.transform = "";
    hsDist = 0;
    if (reduced || innerWidth <= 860) return;
    hs.classList.add("pinned");
    const room = innerHeight - 72 - 56;
    const dist = hsTrack.scrollWidth - innerWidth;
    if (hsTrack.offsetHeight > room || dist <= 0) {
      hs.classList.remove("pinned");
      return;
    }
    hsDist = dist;
    hs.style.height = innerHeight + dist + "px";
  }
  layoutMethod();
  addEventListener("resize", layoutMethod);
  if (document.fonts) document.fonts.ready.then(layoutMethod);
  requestAnimationFrame(frame);

  // ---------- hero: live implicit diffusion ----------
  // Backward-Euler steps of the report's equation (r = 10) on a 96x128 grid:
  // the top edge is held at 100 and pulses of heat are dropped into u^n from
  // time to time, then diffuse out to the cold edges.
  (function hero() {
    const cv = $("#hero-canvas");
    const W = 96, H = 128, r = 10, den = 1 + 4 * r;
    const SWEEPS_PER_STEP = 32;
    let u = new Float32Array(W * H), v = new Float32Array(W * H);
    const un = new Float32Array(W * H);
    for (let j = 0; j < W; j++) u[j] = v[j] = un[j] = 100;
    let sweeps = 0, steps = 0;

    function pulse() {
      const cx = W * (0.2 + Math.random() * 0.6);
      const cy = H * (0.35 + Math.random() * 0.5);
      const s = W / (9 + Math.random() * 5);
      for (let i = 1; i < H - 1; i++)
        for (let j = 1; j < W - 1; j++) {
          const k = i * W + j;
          const add = 85 * Math.exp(-((i - cy) ** 2 + (j - cx) ** 2) / (2 * s * s));
          un[k] = Math.min(100, un[k] + add);
          u[k] = Math.min(100, u[k] + add);
        }
    }

    function sweep() {
      for (let i = 1; i < H - 1; i++)
        for (let j = 1; j < W - 1; j++) {
          const k = i * W + j;
          v[k] = (un[k] + r * (u[k - W] + u[k + W] + u[k - 1] + u[k + 1])) / den;
        }
      const t = u; u = v; v = t;
      if (++sweeps >= SWEEPS_PER_STEP) {
        un.set(u); // close enough to converged: becomes u^n for the next step
        sweeps = 0;
        if (++steps % 14 === 0) pulse();
      }
    }

    // warm up so the field from the hot top edge is already established
    pulse();
    for (let n = 0; n < 60 * SWEEPS_PER_STEP; n++) sweep();

    const opts = { map: (x) => Math.pow(Math.min(1, Math.max(0, x / 100)), 0.8), levels: 14, grid: true, maxDpr: 1.5 };
    const draw = () => Sim.render(cv, u, W, H, opts);
    draw();
    addEventListener("resize", draw);
    if (reduced) return;
    (function tick() {
      if (!document.hidden && cv.getBoundingClientRect().bottom > 0) {
        for (let s = 0; s < 3; s++) sweep();
        draw();
      }
      requestAnimationFrame(tick);
    })();
  })();

  // ---------- helpers ----------
  function legend(id, items) {
    const n = document.getElementById(id);
    if (!n) return;
    n.innerHTML = items
      .map((it) => {
        const c = it.color.startsWith("--") ? `var(${it.color})` : it.color;
        return `<span><i class="${it.shape || ""}" style="background:${c}"></i>${it.name}</span>`;
      })
      .join("");
  }

  function segs(name, onChange) {
    const g = $(`[data-ctrl="${name}"]`);
    g.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", g).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      onChange(b.dataset.v);
    });
  }

  function replay(node) {
    node.classList.remove("drawn");
    node._redraw();
    void node.offsetWidth;
    node.classList.add("drawn");
  }

  const S = ["--s1", "--s2", "--s3"];
  const x2 = (v) => v.toFixed(2) + "×";

  // ---------- Table IV heatmap ----------
  (function heat() {
    const mix = (a, b, t) => {
      const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const A = p(a), B = p(b);
      return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
    };
    const t = D.tableIV;
    let h = `<thead><tr><th>N</th><th>Source</th><th>r</th>${t.cols.map((c) => `<th>${c}</th>`).join("")}<th>s (D8)</th></tr></thead><tbody>`;
    t.rows.forEach(([N, src, r, vals, s]) => {
      h += `<tr><td>${N}</td><td style="text-align:left">${src}</td><td>${r}</td>`;
      vals.forEach((v, i) => {
        let bg, tt;
        if (v < 1) { tt = Math.min(1, (1 - v) / 0.5); bg = mix("#f0efec", "#d0453f", tt); }
        else { tt = Math.min(1, (v - 1) / 0.08); bg = mix("#f0efec", "#2a78d6", tt); }
        const fg = tt > 0.55 ? "#fff" : "#0b0b0b";
        h += `<td class="cell${v > 1 ? " best" : ""}" style="background:${bg};color:${fg}" data-t="N=${N} · ${src} · r=${r}" data-s="${t.cols[i]}" data-v="${v}">${v.toFixed(3)}</td>`;
      });
      h += `<td>${s.toFixed(2)}</td></tr>`;
    });
    const tbl = $("#heat");
    tbl.innerHTML = h + "</tbody>";
    tbl.addEventListener("pointermove", (e) => {
      const c = e.target.closest("td.cell");
      if (!c) return C.hideTip();
      const v = parseFloat(c.dataset.v);
      C.showTip(e, c.dataset.t, [
        { name: c.dataset.s + " vs sync", value: v.toFixed(3) + "×" },
        { name: v >= 1 ? "Faster by" : "Slower by", value: Math.abs((v >= 1 ? v - 1 : 1 / v - 1) * 100).toFixed(1) + "%" },
      ], c);
    });
    tbl.addEventListener("pointerleave", C.hideTip);
  })();

  // ---------- Table V / VI ----------
  $("#tbl-v").innerHTML =
    `<thead><tr><th>N</th><th>r</th><th>Sync (ms)</th><th>Best async</th><th>Async (ms)</th><th>Async / sync</th></tr></thead><tbody>` +
    D.tableV.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4].toFixed(2)}</td><td><b>${r[5].toFixed(3)}</b></td></tr>`).join("") +
    "</tbody>";
  $("#tbl-vi").innerHTML =
    `<thead><tr><th>N</th><th>sync r=1</th><th>sync r=10</th><th>sync r=100</th><th>D8@32×16 r=10</th><th>T8@32×16 r=10</th></tr></thead><tbody>` +
    D.tableVI.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${v == null ? "–" : v.toFixed(3)}</td>`).join("")}</tr>`).join("") +
    "</tbody>";

  // ---------- Fig 2: sweep ratio ----------
  const sw = D.sweepRatio.series.map((s, i) => ({ ...s, color: S[i] }));
  legend("lg-sweep", sw.map((s) => ({ ...s, shape: "sq" })));
  C.bars($("#ch-sweep"), {
    cats: D.sweepRatio.cats, series: sw, y: [0, 3], yTicks: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    yFmt: (v) => v.toFixed(1), yLabel: "Sweeps relative to sync, s", xLabel: "Block-asynchronous strategy",
    refs: [{ y: 1, label: "sync" }], tipFmt: x2,
  });

  // ---------- Fig 3: check interval ----------
  const ci = D.checkInterval;
  const costS = ci.cost.map((s, i) => ({ ...s, color: S[i], shape: i ? "square" : "circle" }));
  legend("lg-cost", costS);
  legend("lg-d8", costS);
  C.line($("#ch-cost"), {
    xs: ci.M, xLog: true, xDomain: [6.5, 1260], y: [0, 24], yTicks: [0, 5, 10, 15, 20],
    yLabel: "µs per sweep", xLabel: "Sweeps between convergence checks, M", series: costS,
    tipX: (m) => "M = " + m, tipFmt: (v) => v.toFixed(2) + " µs", directLabels: true,
  });
  C.line($("#ch-d8"), {
    xs: ci.M, xLog: true, xDomain: [6.5, 1260], y: [0.6, 1.9], yTicks: [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8],
    yFmt: (v) => v.toFixed(1) + "×", yLabel: "D8 speedup over sync", xLabel: "Sweeps between convergence checks, M",
    series: ci.d8.map((s, i) => ({ ...s, color: S[i], shape: i ? "square" : "circle" })),
    refs: [{ y: 1, label: "sync" }], tipX: (m) => "M = " + m, tipFmt: x2, directLabels: true,
  });

  // ---------- Fig 4: bandwidth ----------
  const bwS = D.bandwidth.series.map((s, i) => ({ ...s, color: S[i], shape: i === 1 ? "square" : "circle" }));
  legend("lg-bw", bwS);
  C.line($("#ch-bw"), {
    xs: D.bandwidth.N, xLog: true, xDomain: [880, 21500], xTicks: [1024, 2048, 4096, 8192, 16384],
    y: [0, 700], yTicks: [0, 100, 200, 300, 400, 500, 600, 700], yLabel: "Effective bandwidth (GB/s)",
    xLabel: "Grid size N (N × N)", series: bwS, shade: [880, 1448, "in L2"],
    refs: [{ y: 384, label: "nominal DRAM peak 384 GB/s" }], tipX: (n) => `N = ${n}`, tipFmt: (v) => Math.round(v) + " GB/s",
  });

  // ---------- Fig 5 / Table VII ----------
  const tb = D.tableVII;
  const tbSeries = (r) => [
    { name: "Exact temporal blocking", values: tb.tb[r], color: "--s1", shape: "square" },
    { name: "Block-async (best D)", values: tb.ba[r], color: "--s2" },
  ];
  const tbOpts = {
    xs: tb.N, xLog: true, xDomain: [880, 21500], xTicks: [1024, 2048, 4096, 8192, 16384],
    y: [0.5, 1.9], yTicks: [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8], yFmt: (v) => v.toFixed(1) + "×",
    yLabel: "Speedup over fused sync", xLabel: "Grid size N (N × N)", series: tbSeries(1),
    shade: [880, 1448, "fits in L2"], refs: [{ y: 1, label: "sync" }], tipX: (n) => `N = ${n}`, tipFmt: x2,
    height: 360,
  };
  legend("lg-tb", [{ name: "Exact temporal blocking (T4, 32×32)", color: "--s1", shape: "sq" }, { name: "Block-async (best D)", color: "--s2", shape: "dot" }]);
  const tbNode = C.line($("#ch-tb"), tbOpts);
  segs("tb-r", (r) => { tbOpts.series = tbSeries(r); replay(tbNode); });

  // ---------- Fig 6: (c, s) plane ----------
  function csPoints(big) {
    const pts = [];
    D.tableVIII.forEach(([cfg, fam, c1, S1, c8, s, S8]) => {
      if (!big && cfg.endsWith("64×64")) return;
      const shape = fam === "TB" ? "square" : "circle";
      const famName = fam === "TB" ? "temporal blocking" : "block-async";
      pts.push({ x: c1, y: s, color: "--s2", shape, label: `${cfg} · N=1024 (in L2)`, short: cfg,
        rows: [{ name: "Family", value: famName }, { name: "c (cost/sweep)", value: c1.toFixed(3) }, { name: "s (sweep ratio)", value: s.toFixed(3) }, { name: "S = 1/(cs)", value: x2(S1) }] });
      pts.push({ x: c8, y: s, color: "--s1", shape, label: `${cfg} · N=8192 (out of L2)`, short: cfg, out: true,
        rows: [{ name: "Family", value: famName }, { name: "c (cost/sweep)", value: c8.toFixed(3) }, { name: "s (sweep ratio)", value: s.toFixed(3) }, { name: "S = 1/(cs)", value: x2(S8) }] });
    });
    return pts;
  }
  legend("lg-cs", [
    { name: "N = 8192 (out of L2)", color: "--s1", shape: "dot" },
    { name: "N = 1024 (in L2)", color: "--s2", shape: "dot" },
    { name: "circle = block-async · square = temporal blocking", color: "transparent" },
  ]);
  const csOpts = {
    points: csPoints(false), x: [0.3, 2.3], y: [0.9, 1.85], xTicks: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25],
    yTicks: [1, 1.2, 1.4, 1.6, 1.8], curve: (c) => 1 / c, xLabel: "Per-sweep cost relative to sync, c",
    yLabel: "Sweep ratio relative to sync, s", height: 420,
    labelIf: (p) => p.out && ["D8@32×16", "D8@32×32", "D4@32×32", "T4@32×32"].includes(p.short),
  };
  const csNode = C.scatter($("#ch-cs"), csOpts);
  segs("cs-big", (v) => {
    const big = v === "1";
    csOpts.points = csPoints(big);
    csOpts.x = big ? [0.3, 3.3] : [0.3, 2.3];
    csOpts.xTicks = big ? [0.5, 1, 1.5, 2, 2.5, 3] : [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25];
    replay(csNode);
  });

  // ---------- Table IX: shrinking advantage ----------
  legend("lg-steps", [{ name: "r ≥ 10", color: "--s1", shape: "sq" }, { name: "r = 1", color: "--s2", shape: "sq" }, { name: "dashed line = break-even (1.0×)", color: "transparent" }]);
  const stepsNode = $("#steps");
  const notes = [
    "The headline number, against the original unfused synchronous kernel at N = 2048 and 4096.",
    "Make the baseline as economical with memory traffic as the async kernel already was. Removes ≈ 15%.",
    "Ask whether the gain needs stale data at all. Most of it doesn't: exact blocking gets ≈ 1.3× alone.",
    "Same tile and same D (D4 vs T4, 32×32) removes the selection effect. This is the honest remainder.",
  ];
  D.tableIX.forEach((st, i) => {
    const row = document.createElement("div");
    row.className = "step rv";
    row.innerHTML = `<span class="n">0${i + 1}</span><div><h4>${st.step}</h4><p>${notes[i]}</p></div><div class="mini"></div>`;
    stepsNode.appendChild(row);
    rio.observe(row);
    C.ranges($(".mini", row), {
      title: st.step, x: [0.6, 1.9], xTicks: [0.8, 1.0, 1.2, 1.4, 1.6, 1.8],
      series: [{ name: "r ≥ 10", range: st.r10, color: "--s1" }, { name: "r = 1", range: st.r1, color: "--s2" }],
    });
  });

  // ---------- Table X: guided policies ----------
  legend("lg-pol", [{ name: "vs. best static", color: "--s1", shape: "sq" }, { name: "vs. always sync", color: "--s2", shape: "sq" }]);
  C.hbars($("#ch-pol"), {
    rows: D.tableX.map((p) => ({
      label: p.name, hi: p.name === "G-fb",
      values: [{ v: p.best, color: "--s1", name: "vs. best static" }, { v: p.sync, color: "--s2", name: "vs. always sync" }],
      extra: [{ name: "Rule", value: p.rule }],
    })),
    x: [0, 35], xTicks: [0, 10, 20, 30], xFmt: (v) => "+" + v + "%", fmt: (v) => "+" + v.toFixed(1) + "%", labelWidth: 90,
  });

  // ---------- Table XI: selector ----------
  C.hbars($("#ch-sel"), {
    rows: D.tableXI.map((p) => ({
      label: p.name + (p.acc !== "–" ? `  (${p.acc})` : ""), hi: p.hi,
      values: [{ v: p.slow, color: p.name.startsWith("Tree") ? "--s1" : "#77766f", name: "Mean slowdown" }],
      extra: [{ name: "Accuracy", value: p.acc }],
    })),
    x: [0, 42], xTicks: [0, 10, 20, 30, 40], xFmt: (v) => v + "%", fmt: (v) => v.toFixed(1) + "%", labelWidth: 260, rowH: 26,
  });

  // ---------- interactive staleness demo ----------
  (function demo() {
    const st = { r: 10, D: 8, src: "gauss" };
    const N = 96;
    const chartNode = $("#demo-chart");
    const field = $("#demo-field");
    const opts = {
      xs: [0, 8], xDomain: [0, 8], y: [-6, 0], yTicks: [-6, -5, -4, -3, -2, -1, 0],
      yFmt: (v) => (v === 0 ? "1" : "1e" + v), yLabel: "Relative residual ρ", xLabel: "Sweeps",
      series: [], refs: [{ y: -5, label: "tolerance 1e-5" }], tipX: (s) => `Sweep ${s}`,
      tipFmt: (v) => Math.pow(10, v).toExponential(2), height: 300, noMarkers: true,
    };
    let node = null;

    // log scale, so the unit-peak source and the 100-degree edge both show
    const logMap = (x) => Math.log1p(Math.max(0, x) * 20) / Math.log1p(2000);
    let shown = null;
    const paint = (u) => { shown = u; Sim.render(field, u, N, N, { map: logMap, levels: 12, grid: true }); };
    addEventListener("resize", () => shown && paint(shown));

    // ten consecutive time steps per (r, source), as in the paper's runs;
    // cached so switching D only re-runs the block-async step
    const history = {};
    function stepsFor(r, src) {
      const key = r + src;
      if (!history[key]) {
        const p = Sim.makeProblem(N, src);
        let u = p.u;
        for (let s = 0; s < 9; s++) u = Sim.solveStep(p, u, r, 0).u;
        history[key] = { p, u9: u, sync: Sim.solveStep(p, u, r, 0) };
      }
      return history[key];
    }

    function run() {
      chartNode.style.opacity = 0.4;
      setTimeout(() => {
        const { p, u9, sync } = stepsFor(st.r, st.src);
        const asy = Sim.solveStep(p, u9, st.r, st.D);
        const maxS = Math.max(sync.sweeps, asy.sweeps);
        const xs = [];
        for (let s = 0; s <= maxS; s += 8) xs.push(s);
        const toVals = (tr) => xs.map((x) => { const h = tr.find((q) => q[0] === x); return h ? Math.log10(Math.max(h[1], 1e-7)) : null; });
        const lbl = "Block-async D" + st.D;
        opts.xs = xs;
        opts.xDomain = [0, maxS];
        opts.xTicks = niceTicks(maxS);
        opts.y = [-6, Math.max(0, Math.ceil(Math.log10(sync.trace[0][1])))];
        opts.yTicks = [];
        for (let t = opts.y[0]; t <= opts.y[1]; t++) opts.yTicks.push(t);
        opts.series = [
          { name: "Synchronous", values: toVals(sync.trace), color: "--s1" },
          { name: lbl, values: toVals(asy.trace), color: "--s2" },
        ];
        legend("demo-legend", opts.series.map((s) => ({ ...s, shape: "" })));
        if (!node) node = C.line(chartNode, opts);
        else replay(node);
        chartNode.style.opacity = 1;
        $("#ds-sync").textContent = sync.sweeps;
        $("#ds-async").textContent = asy.sweeps;
        $("#ds-ratio").textContent = (asy.sweeps / sync.sweeps).toFixed(2) + "×";
        const saved = 1 - asy.sweeps / st.D / sync.sweeps;
        $("#ds-launch").textContent = (saved > 0 ? "−" : "") + Math.round(Math.abs(saved) * 100) + "%";
        paint(sync.u);
      }, 30);
    }

    function niceTicks(max) {
      const step = [8, 16, 40, 80, 160, 400, 800][[64, 128, 320, 640, 1280, 3200, 1e9].findIndex((t) => max <= t)];
      const t = [];
      for (let v = 0; v <= max; v += step) t.push(v);
      return t;
    }

    segs("r", (v) => { st.r = +v; run(); });
    segs("D", (v) => { st.D = +v; run(); });
    segs("src", (v) => { st.src = v; run(); });

    // run once the demo is near the viewport
    const dio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { dio.disconnect(); run(); } }, { rootMargin: "300px" });
    dio.observe($("#demo"));
  })();
})();
