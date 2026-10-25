// Small dependency-free SVG chart kit: line, grouped bar, scatter, horizontal
// bar and range charts. Each chart re-renders on resize, animates in when it
// enters the viewport (via the .drawn class), and has a hover tooltip.

(function () {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === "style") n.style.cssText = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  const logS = (d0, d1, r0, r1) => {
    const f = lin(Math.log2(d0), Math.log2(d1), r0, r1);
    return (v) => f(Math.log2(v));
  };
  const cssVar = (node, name) => getComputedStyle(node).getPropertyValue(name).trim() || name;
  const colorOf = (node, c) => (c.startsWith("--") ? cssVar(node, c) : c);
  const fill = (c) => (c.startsWith("--") ? `var(${c})` : c);

  // ---------- tooltip ----------
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("role", "status");
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(tip));

  function showTip(evt, title, rows, node) {
    tip.innerHTML =
      `<b>${title}</b>` +
      rows
        .map(
          (r) =>
            `<div class="row"><span>${r.color ? `<i style="background:${colorOf(node, r.color)}"></i>` : ""}${r.name}</span><span>${r.value}</span></div>`
        )
        .join("");
    tip.classList.add("on");
    const pad = 16;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    if (x + w > innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > innerHeight - 8) y = evt.clientY - h - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip() {
    tip.classList.remove("on");
  }

  // ---------- lifecycle ----------
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("drawn");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.25 }
  );

  function mount(node, render) {
    node.classList.add("chart");
    let lastW = 0;
    const draw = () => {
      const w = Math.round(node.clientWidth);
      if (!w || w === lastW) return;
      lastW = w;
      node.innerHTML = "";
      render(w);
      node.querySelectorAll(".series-line").forEach((p) => {
        p.style.setProperty("--len", Math.ceil(p.getTotalLength() + 2));
      });
    };
    new ResizeObserver(draw).observe(node);
    io.observe(node);
    node._redraw = () => {
      lastW = 0;
      draw();
    };
    draw();
    return node;
  }

  function frame(node, w, h, m) {
    const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img" }, node);
    const iw = w - m.l - m.r;
    const ih = h - m.t - m.b;
    const g = el("g", { transform: `translate(${m.l},${m.t})` }, svg);
    return { svg, g, iw, ih };
  }

  function yAxis(g, y, ticks, iw, fmt, label, ih) {
    const ax = el("g", { class: "ax" }, g);
    ticks.forEach((t) => {
      el("line", { class: "gridline", x1: 0, x2: iw, y1: y(t), y2: y(t) }, g);
      el("text", { x: -8, y: y(t) + 4, "text-anchor": "end", text: fmt(t) }, ax);
    });
    if (label) el("text", { x: -38, y: ih / 2, "text-anchor": "middle", transform: `rotate(-90 -38 ${ih / 2})`, text: label }, ax);
    g.insertBefore(ax, g.firstChild);
    g.querySelectorAll(".gridline").forEach((l) => g.insertBefore(l, g.firstChild));
  }

  function xAxisTicks(g, x, ticks, ih, fmt, label, iw) {
    const ax = el("g", { class: "ax" }, g);
    el("line", { x1: 0, x2: iw, y1: ih, y2: ih }, ax);
    ticks.forEach((t, i) => {
      el("line", { x1: x(t), x2: x(t), y1: ih, y2: ih + 4 }, ax);
      el("text", { x: x(t), y: ih + 18, "text-anchor": "middle", text: fmt(t, i) }, ax);
    });
    if (label) el("text", { x: iw / 2, y: ih + 38, "text-anchor": "middle", text: label }, ax);
  }

  // ---------- line chart ----------
  function line(node, o) {
    return mount(node, (w) => {
      const narrow = w < 480;
      const h = o.height || (narrow ? 260 : 320);
      const m = { t: 16, r: narrow ? 16 : 24, b: o.xLabel ? 48 : 30, l: o.yLabel ? 56 : 44 };
      const { svg, g, iw, ih } = frame(node, w, h, m);
      const x = o.xLog ? logS(o.xDomain[0], o.xDomain[1], 0, iw) : lin(o.xDomain[0], o.xDomain[1], 0, iw);
      const y = lin(o.y[0], o.y[1], ih, 0);

      if (o.shade) {
        const [a, b, lab] = o.shade;
        el("rect", { class: "shade", x: x(a), y: 0, width: x(b) - x(a), height: ih }, g);
        el("text", { class: "shade-label", x: x(a) + 6, y: 14, text: lab }, g);
      }
      yAxis(g, y, o.yTicks, iw, o.yFmt || String, o.yLabel, ih);
      xAxisTicks(g, x, o.xTicks || o.xs, ih, o.xFmt || String, o.xLabel, iw);
      (o.refs || []).forEach((r) => {
        el("line", { class: "ref", x1: 0, x2: iw, y1: y(r.y), y2: y(r.y) }, g);
        el("text", { class: "ref-label", x: iw - 4, y: y(r.y) - 6, "text-anchor": "end", text: r.label }, g);
      });

      o.series.forEach((s) => {
        let d = "";
        let pen = false;
        s.values.forEach((v, i) => {
          if (v == null) { pen = false; return; }
          d += (pen ? "L" : "M") + x(o.xs[i]).toFixed(1) + "," + y(v).toFixed(1);
          pen = true;
        });
        el("path", { class: "series-line", d, style: `stroke:${fill(s.color)}` }, g);
        if (!o.noMarkers) s.values.forEach((v, i) => {
          if (v == null) return;
          const at = { cx: x(o.xs[i]), cy: y(v), r: 4.5, class: "mk", style: `fill:${fill(s.color)};stroke:var(--surface);stroke-width:2` };
          if (s.shape === "square") el("rect", { ...at, x: at.cx - 4.5, y: at.cy - 4.5, width: 9, height: 9, rx: 1 }, g);
          else el("circle", at, g);
        });
        if (o.directLabels && !narrow) {
          const li = s.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
          el("text", { class: "dlabel", x: x(o.xs[li]) + 9, y: y(s.values[li]) + 4, text: s.name }, g);
        }
      });

      // crosshair
      const cross = el("line", { x1: 0, x2: 0, y1: 0, y2: ih, style: "stroke:var(--ink-3);opacity:0" }, g);
      const hit = el("rect", { class: "hit", x: 0, y: 0, width: iw, height: ih }, g);
      const pick = (evt) => {
        const r = svg.getBoundingClientRect();
        const px = evt.clientX - r.left - m.l;
        let best = 0;
        o.xs.forEach((xv, i) => { if (Math.abs(x(xv) - px) < Math.abs(x(o.xs[best]) - px)) best = i; });
        cross.setAttribute("x1", x(o.xs[best]));
        cross.setAttribute("x2", x(o.xs[best]));
        cross.style.opacity = 0.6;
        showTip(
          evt,
          (o.tipX || ((v) => v))(o.xs[best]),
          o.series
            .filter((s) => s.values[best] != null)
            .map((s) => ({ name: s.name, color: s.color, value: (o.tipFmt || o.yFmt || String)(s.values[best]) })),
          node
        );
      };
      hit.addEventListener("pointermove", pick);
      hit.addEventListener("pointerleave", () => { cross.style.opacity = 0; hideTip(); });
    });
  }

  // ---------- grouped bars ----------
  function bars(node, o) {
    return mount(node, (w) => {
      const h = o.height || (w < 480 ? 260 : 320);
      const m = { t: 16, r: 16, b: o.xLabel ? 48 : 30, l: o.yLabel ? 56 : 44 };
      const { svg, g, iw, ih } = frame(node, w, h, m);
      const y = lin(o.y[0], o.y[1], ih, 0);
      yAxis(g, y, o.yTicks, iw, o.yFmt || String, o.yLabel, ih);
      const band = iw / o.cats.length;
      const gap = 2;
      const groupW = Math.min(band * 0.72, 150);
      const bw = (groupW - gap * (o.series.length - 1)) / o.series.length;
      const ax = el("g", { class: "ax" }, g);
      el("line", { x1: 0, x2: iw, y1: ih, y2: ih }, ax);
      o.cats.forEach((c, ci) => {
        const x0 = band * ci + (band - groupW) / 2;
        el("text", { x: band * ci + band / 2, y: ih + 18, "text-anchor": "middle", text: c }, ax);
        o.series.forEach((s, si) => {
          const v = s.values[ci];
          const bx = x0 + si * (bw + gap);
          const top = y(v);
          const hgt = ih - top;
          const r = Math.min(4, bw / 2, hgt);
          const d = `M${bx},${ih}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${ih}Z`;
          const p = el("path", { class: "bar", d, style: `fill:${fill(s.color)};transition-delay:${ci * 0.08 + si * 0.04}s` }, g);
          const hitR = el("rect", { class: "hit", x: bx - gap / 2, y: 0, width: bw + gap, height: ih }, g);
          hitR.addEventListener("pointermove", (e) => {
            p.style.opacity = 0.8;
            showTip(e, c, [{ name: s.name, color: s.color, value: (o.tipFmt || String)(v) }], node);
          });
          hitR.addEventListener("pointerleave", () => { p.style.opacity = 1; hideTip(); });
        });
      });
      if (o.xLabel) el("text", { x: iw / 2, y: ih + 38, "text-anchor": "middle", text: o.xLabel }, ax);
      (o.refs || []).forEach((r) => {
        el("line", { class: "ref", x1: 0, x2: iw, y1: y(r.y), y2: y(r.y) }, g);
        el("text", { class: "ref-label", x: iw - 4, y: y(r.y) - 6, "text-anchor": "end", text: r.label }, g);
      });
    });
  }

  // ---------- scatter (c, s plane) ----------
  function scatter(node, o) {
    return mount(node, (w) => {
      const h = o.height || (w < 480 ? 300 : 380);
      const m = { t: 16, r: 20, b: 48, l: 56 };
      const { svg, g, iw, ih } = frame(node, w, h, m);
      const x = lin(o.x[0], o.x[1], 0, iw);
      const y = lin(o.y[0], o.y[1], ih, 0);
      yAxis(g, y, o.yTicks, iw, (v) => v.toFixed(1), o.yLabel, ih);
      xAxisTicks(g, x, o.xTicks, ih, (v) => v.toFixed(2), o.xLabel, iw);

      if (o.curve) {
        let d = "";
        for (let i = 0; i <= 120; i++) {
          const cv = o.x[0] + ((o.x[1] - o.x[0]) * i) / 120;
          const sv = o.curve(cv);
          if (sv < o.y[0] - 0.05 || sv > o.y[1] + 0.05) continue;
          d += (d ? "L" : "M") + x(cv).toFixed(1) + "," + y(sv).toFixed(1);
        }
        el("path", { d, class: "ref", fill: "none" }, g);
        el("text", { class: "ref-label", x: x(1 / o.y[1]) + 8, y: 14, text: "c · s = 1  (break-even)" }, g);
        el("text", { class: "shade-label", x: 6, y: ih - 8, text: "← faster than sync" }, g);
      }

      o.points.forEach((p, i) => {
        const cx = x(p.x);
        const cy = y(p.y);
        const style = `fill:${fill(p.color)};stroke:var(--surface);stroke-width:2;transition:opacity .6s ${0.6 + i * 0.04}s, transform .2s;transform-origin:${cx}px ${cy}px`;
        const mk = p.shape === "square"
          ? el("rect", { class: "mk", x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 1.5, style }, g)
          : el("circle", { class: "mk", cx, cy, r: 6.5, style }, g);
        if (p.label && o.labelIf && o.labelIf(p)) {
          el("text", { class: "dlabel", x: cx + 10, y: cy - 8, text: p.short || p.label }, g);
        }
        const hit = el("circle", { class: "hit", cx, cy, r: 14 }, g);
        hit.addEventListener("pointermove", (e) => {
          mk.style.transform = "scale(1.35)";
          showTip(e, p.label, p.rows, node);
        });
        hit.addEventListener("pointerleave", () => { mk.style.transform = ""; hideTip(); });
      });
    });
  }

  // ---------- horizontal grouped bars ----------
  function hbars(node, o) {
    return mount(node, (w) => {
      const narrow = w < 520;
      const labW = narrow ? 0 : o.labelWidth || 200;
      const rowH = o.rowH || 22;
      const per = o.rows[0].values.length;
      const groupH = per * rowH + (per - 1) * 2;
      const step = groupH + (narrow ? 34 : 18);
      const h = o.rows.length * step + 30;
      const m = { t: narrow ? 18 : 4, r: 56, b: 26, l: labW };
      const { svg, g, iw, ih } = frame(node, w, h, m);
      const x = lin(o.x[0], o.x[1], 0, iw);
      const ax = el("g", { class: "ax" }, g);
      o.xTicks.forEach((t) => {
        el("line", { class: "gridline", x1: x(t), x2: x(t), y1: 0, y2: ih }, g);
        el("text", { x: x(t), y: ih + 18, "text-anchor": "middle", text: (o.xFmt || String)(t) }, ax);
      });
      o.rows.forEach((row, ri) => {
        const y0 = ri * step;
        el("text", {
          x: narrow ? 0 : -14, y: narrow ? y0 - 6 : y0 + groupH / 2 + 4, "text-anchor": narrow ? "start" : "end",
          text: row.label, style: `font-size:13px;fill:var(--ink);font-weight:${row.hi ? 800 : 500}`,
        }, g);
        row.values.forEach((v, vi) => {
          const by = y0 + vi * (rowH + 2);
          const bw = Math.max(0, x(v.v) - x(o.x[0]));
          const r = Math.min(4, bw);
          const d = `M0,${by}H${bw - r}Q${bw},${by} ${bw},${by + r}V${by + rowH - r}Q${bw},${by + rowH} ${bw - r},${by + rowH}H0Z`;
          const p = el("path", { class: "hbar", d, style: `fill:${fill(v.color)};transition-delay:${ri * 0.1 + vi * 0.05}s` }, g);
          el("text", { x: bw + 8, y: by + rowH / 2 + 4, text: (o.fmt || String)(v.v), style: "font-size:12px;fill:var(--ink-2);font-family:var(--mono)" }, g);
          const hit = el("rect", { class: "hit", x: 0, y: by, width: iw, height: rowH }, g);
          hit.addEventListener("pointermove", (e) => {
            p.style.opacity = 0.8;
            showTip(e, row.label, [{ name: v.name, color: v.color, value: (o.fmt || String)(v.v) }].concat(row.extra || []), node);
          });
          hit.addEventListener("pointerleave", () => { p.style.opacity = 1; hideTip(); });
        });
      });
    });
  }

  // ---------- range bars (min..max per series) ----------
  function ranges(node, o) {
    return mount(node, (w) => {
      const rowH = 14;
      const h = o.series.length * (rowH + 6) + 30;
      const m = { t: 4, r: 84, b: 24, l: 8 };
      const { svg, g, iw, ih } = frame(node, w, h, m);
      const x = lin(o.x[0], o.x[1], 0, iw);
      const ax = el("g", { class: "ax" }, g);
      o.xTicks.forEach((t) => {
        el("line", { class: "gridline", x1: x(t), x2: x(t), y1: 0, y2: ih }, g);
        el("text", { x: x(t), y: ih + 16, "text-anchor": "middle", text: t.toFixed(1) + "×" }, ax);
      });
      el("line", { class: "ref", x1: x(1), x2: x(1), y1: -2, y2: ih }, g);
      o.series.forEach((s, i) => {
        const [a, b] = s.range;
        const by = i * (rowH + 6) + 2;
        const bw = Math.max(6, x(b) - x(a));
        const p = el("rect", { class: "rbar", x: x(a), y: by, width: bw, height: rowH, rx: 4, style: `fill:${fill(s.color)};transition-delay:${0.1 + i * 0.1}s` }, g);
        el("text", { x: x(a) + bw + 8, y: by + rowH - 3, text: `${a.toFixed(2)}–${b.toFixed(2)}×`, style: "font-size:11px;fill:var(--ink-2);font-family:var(--mono)" }, g);
        const hit = el("rect", { class: "hit", x: 0, y: by - 2, width: iw, height: rowH + 4 }, g);
        hit.addEventListener("pointermove", (e) => showTip(e, o.title, [{ name: s.name, color: s.color, value: `${a.toFixed(2)}–${b.toFixed(2)}×` }], node));
        hit.addEventListener("pointerleave", hideTip);
      });
    });
  }

  window.Charts = { line, bars, scatter, hbars, ranges, showTip, hideTip };
})();
