/* GenoBit Neuroimaging progress deck: scene engine and cover adapted from Mmateo101/presentation-neuroimaging,
   plus per-scene animations. Data comes from assets/generated/stats.js (window.OASIS). */
(function () {
  'use strict';
  var D = window.OASIS || {};
  var NS = 'http://www.w3.org/2000/svg';
  var G = 'assets/generated/';
  var SH = {}, TICK = {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function set(id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pingpong(t, fps, n) { var p = Math.floor(t * fps) % (2 * n - 2 || 1); return p < n ? p : 2 * n - 2 - p; }

  /* ---------------- sprites: one tall JPG, one frame visible at a time ---------------- */
  function spriteMeta(key) {
    var k = key.split('.');
    if (k[0] === 'plane') return D.plane_sprites && D.plane_sprites[k[1]];
    if (k[0] === 'raw') return D.raw_sweep;
    if (k[0] === 'scan') return D.scan_sprites && D.scan_sprites[k[1]];
    if (k[0] === 'entropy') return D.entropy && D.entropy.sprite;
  }
  function initSprite(el, meta) {
    if (!meta) return;
    el._m = meta;
    el.style.backgroundImage = 'url(' + G + meta.file + ')';
    el.style.backgroundSize = '100% ' + meta.frames * 100 + '%';
    setFrame(el, 0);
  }
  function setFrame(el, i) {
    if (!el._m) return;
    var n = el._m.frames;
    i = Math.max(0, Math.min(n - 1, Math.round(i)));
    if (el._f === i) return;
    el._f = i;
    el.style.backgroundPosition = '0 ' + (n > 1 ? i / (n - 1) * 100 : 0) + '%';
  }
  $$('[data-sprite]').forEach(function (el) { initSprite(el, spriteMeta(el.dataset.sprite)); });

  /* ---------------- corner logo ---------------- */
  (function () {
    var L = $('#gbLogo'), A = '', Bp = '', x, t;
    for (x = 70; x <= 630; x += 7) { t = (x - 70) / 280 * 2 * Math.PI; A += (x === 70 ? 'M' : 'L') + x + ' ' + (345 + 62 * Math.sin(t)).toFixed(1) + ' '; Bp += (x === 70 ? 'M' : 'L') + x + ' ' + (345 - 62 * Math.sin(t)).toFixed(1) + ' '; }
    for (x = 84; x <= 616; x += 28) { t = (x - 70) / 280 * 2 * Math.PI; var sn = Math.sin(t); if (Math.abs(sn) >= .4) svg('line', { 'class': 'r', x1: x, x2: x, y1: (345 + 62 * sn * .82).toFixed(1), y2: (345 - 62 * sn * .82).toFixed(1) }, L); }
    svg('path', { 'class': 'a', d: A }, L); svg('path', { 'class': 'b', d: Bp }, L);
    [['M350 80 V250', 350, 60], ['M255 130 V262', 255, 110], ['M445 130 V262', 445, 110], ['M170 160 H190 Q204 160 204 176 V272', 150, 160], ['M530 160 H510 Q496 160 496 176 V272', 550, 160]].forEach(function (q) {
      svg('path', { 'class': 'p', d: q[0] }, L); svg('circle', { 'class': 'c', cx: q[1], cy: q[2], r: 20 }, L);
    });
  })();

  /* ---------------- 01 portada: the brain's lines gather into a DNA helix that becomes the logo ---------------- */
  (function () {
    var sc = $('#cover'), cv = $('#dnaCv'), g = cv.getContext('2d'), pts = null, groups = [], t0 = 0, running = false;
    /* final helix = the logo helix in stage coordinates (logoG: translate(960 440) scale(1.7) translate(-350 -225)) */
    var LOGO = { x0: 960 + 1.7 * (70 - 350), x1: 960 + 1.7 * (630 - 350), cy: 440 + 1.7 * (345 - 225), amp: 1.7 * 62, period: 1.7 * 280 };
    var LOOSE = { x0: 150, x1: 1770, cy: 540, amp: 300, period: 820 };
    var ez = function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
    var mix = function (a, b, u) { return a + (b - a) * u; };
    function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

    function sample() {
      var paths = $$('#brainG path'), lens = paths.map(function (p) { return p.getTotalLength(); });
      var total = lens.reduce(function (a, b) { return a + b; }, 0), stepL = total / 1500, out = [];
      paths.forEach(function (p, k) {
        var col = hexRgb(p.getAttribute('stroke') || '#2FD0C6');
        var gr = { col: col, pts: [] };
        for (var d = 0; d < lens[k]; d += stepL) { var q = p.getPointAtLength(d), o = { bx: q.x, by: q.y, col: col, gid: k % 7 }; out.push(o); gr.pts.push(o); }
        if (gr.pts.length > 1) groups.push(gr);
      });
      out.sort(function (a, b) { return a.bx - b.bx; });
      /* roles: strand A, strand B, rungs; each strand point keeps its left-to-right order */
      var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var A = [], B = [], R = [];
      out.forEach(function (o) { var r = rnd(); (r < .42 ? A : r < .84 ? B : R).push(o); });
      A.forEach(function (o, i) { o.role = 0; o.u = i / (A.length - 1); });
      B.forEach(function (o, i) { o.role = 1; o.u = i / (B.length - 1); });
      var rungX = []; for (var x = 84; x <= 616; x += 28) { var s = Math.sin((x - 70) / 280 * 2 * Math.PI); if (Math.abs(s) >= .4) rungX.push(x); }
      var perRung = Math.ceil(R.length / rungX.length);
      R.forEach(function (o, i) {     /* points spread evenly along each rung so it reads as a solid bar */
        var r = i % rungX.length, n = Math.floor(i / rungX.length);
        o.role = 2; o.rung = (rungX[r] - 70) / 560; o.v = perRung > 1 ? -1 + 2 * n / (perRung - 1) : 0;
      });
      out.forEach(function (o) { o.jx = (rnd() - .5) * 2; o.jy = (rnd() - .5) * 2; o.delay = rnd() * .5; });
      return out;
    }
    /* the brain drawn as lines (same points, in path order), drifting like a current */
    var LINE_T = 2.2;
    function wave(o, e) {
      var a = 34 * Math.min(1, e / 1.6);
      return [o.bx + a * Math.sin(o.by * .011 + e * 2.6 + o.gid), o.by + a * Math.cos(o.bx * .009 + e * 2.1 + o.gid * .7)];
    }
    function drawLines(e, alpha) {
      g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
      groups.forEach(function (gr) {
        g.strokeStyle = 'rgba(' + gr.col.join(',') + ',' + alpha.toFixed(2) + ')';
        g.beginPath();
        gr.pts.forEach(function (o, i) { var p = wave(o, e); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
        g.stroke();
      });
    }
    function target(o, H, ph, noise) {
      var u = o.role === 2 ? o.rung : o.u, x = mix(H.x0, H.x1, u), th = (x - H.x0) / H.period * 2 * Math.PI + ph, s = Math.sin(th), y;
      if (o.role === 0) y = H.cy + H.amp * s;
      else if (o.role === 1) y = H.cy - H.amp * s;
      else y = H.cy + H.amp * s * .82 * o.v;
      return [x + o.jx * noise, y + o.jy * noise];
    }
    var TEAL = [0, 112, 111], SKY = [169, 205, 229];
    function frame(e) {
      /* the points gather into a wide, loose helix that keeps turning while it shrinks and condenses;
         the turning slows down and stops exactly in the logo's pose, and the points become its strokes */
      g.clearRect(0, 0, 1920, 1080);
      var gather = Math.min(1, e / 2.4), cond = ez(Math.max(0, Math.min(1, (e - .8) / 5.6)));
      var H = {}; for (var k in LOGO) H[k] = mix(LOOSE[k], LOGO[k], cond);
      var spin = 4 * 2 * Math.PI * (1 - Math.pow(1 - Math.min(1, e / 6.4), 3));
      var noise = 60 * (1 - ez(Math.max(0, Math.min(1, (e - .6) / 4.2))));
      var grow = Math.pow(cond, 2.5);
      for (var i = 0; i < pts.length; i++) {
        var o = pts[i], u = ez(Math.max(0, Math.min(1, (gather - o.delay * .6) / (1 - o.delay * .6))));
        var tg = target(o, H, spin, noise), x = mix(o.sx, tg[0], u), y = mix(o.sy, tg[1], u);
        var c = o.role === 1 ? SKY : TEAL, r = Math.round(mix(o.col[0], c[0], u)), gg = Math.round(mix(o.col[1], c[1], u)), b = Math.round(mix(o.col[2], c[2], u));
        g.fillStyle = 'rgb(' + r + ',' + gg + ',' + b + ')';
        g.beginPath(); g.arc(x, y, mix(2.2, o.role === 2 ? 6.8 : 11, grow), 0, 6.2832); g.fill();
      }
      return e < 6.6;
    }
    SH.cover = function (s, step) {
      if (step === 1 && !running) {
        pts = pts || sample(); t0 = 0; running = true;
      } else if (step === 0) {
        running = false; g.clearRect(0, 0, 1920, 1080); sc.classList.remove('dna-done', 'pins', 'word');
      }
    };
    SH.cover.reset = function () { running = false; g.clearRect(0, 0, 1920, 1080); sc.classList.remove('dna-done', 'pins', 'word', 'exit'); };
    TICK.cover = function (t) {
      if (!running) return;
      if (!t0) t0 = t;
      var e = t - t0, alive = true;
      if (e < LINE_T) {
        g.clearRect(0, 0, 1920, 1080);
        drawLines(e, 1 - Math.max(0, (e - 1.5) / .7));
        if (e > 1.5) {          /* lines break into points */
          var a = (e - 1.5) / .7;
          pts.forEach(function (o) { var p = wave(o, e); g.fillStyle = 'rgba(' + o.col.join(',') + ',' + a.toFixed(2) + ')'; g.beginPath(); g.arc(p[0], p[1], 2.2, 0, 6.2832); g.fill(); });
        }
      } else {
        if (!pts[0].sx) pts.forEach(function (o) { var p = wave(o, LINE_T); o.sx = p[0]; o.sy = p[1]; });
        alive = frame(e - LINE_T);
      }
      var d = e - LINE_T;
      sc.classList.toggle('pins', d > 6.4);
      sc.classList.toggle('word', d > 7.3);
      if (!alive && d > 8) running = false;          /* the last frame stays on the canvas as the logo helix */
    };
  })();

  function clamp(u) { return Math.max(0, Math.min(1, u)); }
  function ease(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  /* ---------------- 02 alzheimer: the brain shrinks while the damage spreads; the matching scan lights up ---------------- */
  (function () {
    var B = $('#azB'), R = [$('#azR1'), $('#azR2'), $('#azR3')], S = $$('#azS path');
    var sg = [$('#azS0'), $('#azS1'), $('#azS2')], t0 = 0, last = -1;
    SH.alz = function () { t0 = 0; last = -1; };
    TICK.alz = function (t) {
      if (!t0) t0 = t;
      var e = (t - t0) % 12.5, p = clamp(e / 9);
      R[0].style.opacity = clamp((p - .04) / .12).toFixed(2);
      R[1].style.opacity = clamp((p - .36) / .12).toFixed(2);
      R[2].style.opacity = clamp((p - .69) / .12).toFixed(2);
      B.style.transform = 'scale(' + (1 - .08 * p).toFixed(3) + ')';
      S.forEach(function (s) { s.style.strokeWidth = (5 + 7 * p).toFixed(1); });      /* sulci widen */
      var k = p < .34 ? 0 : p < .67 ? 1 : 2;
      if (k !== last) { last = k; sg.forEach(function (g, i) { g.classList.toggle('on', i === k); }); }
    };
  })();

  /* ---------------- 05 cómo se toma una RM: the bed slides in, the scan starts, the planes appear (slow) ---------------- */
  (function () {
    var sc = $('#rm'), bed = $('#rmBed'), beam = $('#rmScan'), V = $$('#rm .view'), L = $$('#rm .vl'), AT = [4, 5.6, 7.2], t0 = 0;
    function reset() { t0 = 0; sc.classList.remove('scanning'); V.concat(L).forEach(function (e) { e.classList.remove('on'); }); bed.setAttribute('transform', ''); }
    SH.rm = function () { t0 = 0; };
    SH.rm.reset = reset;
    TICK.rm = function (t) {
      if (!t0) t0 = t;
      var e = t - t0, slide = ease(clamp((e - .6) / 2.6)), scanning = e > 3.4;
      bed.setAttribute('transform', 'translate(' + (190 * slide).toFixed(1) + ' 0)');
      sc.classList.toggle('scanning', scanning);
      if (scanning) beam.setAttribute('x', (506 + (Math.sin((e - 3.4) * 2.2) * .5 + .5) * 120).toFixed(1));
      V.forEach(function (el, i) {
        var on = e > AT[i];
        el.classList.toggle('on', on); L[i].classList.toggle('on', on);
        if (on && el._m) setFrame(el, pingpong(e - AT[i] + 5, 4, el._m.frames));      /* 4 frames/s: slow sweep */
      });
    };
  })();

  /* ---------------- 08 estado del arte: six model families, each with a small looping animation ----------------
     Studies and numbers from Nibila y Sivagami (2026), Front. Artif. Intell. 10.3389/frai.2026.1748985
     (Helaly et al. 2022: CN vs AD value from the original paper). */
  (function () {
    var A = {}, k;
    function cyc(t, T) { return (t % T) / T; }
    function clamp(u) { return Math.max(0, Math.min(1, u)); }

    /* SVM: the boundary swings, settles on the widest margin, support vectors light up */
    (function () {
      var s = $('#anSvm');
      [[40, 140], [60, 165], [35, 105], [80, 150], [70, 105], [95, 178], [25, 165]].forEach(function (p) { svg('circle', { 'class': 'c0', cx: p[0], cy: p[1], r: 7 }, s); });
      [[150, 50], [130, 80], [165, 85], [120, 35], [172, 130], [148, 112], [105, 70]].forEach(function (p) { svg('circle', { 'class': 'c1', cx: p[0], cy: p[1], r: 7 }, s); });
      var m1 = svg('line', { 'class': 'mg' }, s), m2 = svg('line', { 'class': 'mg' }, s), ln = svg('line', { 'class': 'ln' }, s);
      var r1 = svg('circle', { 'class': 'ring', cx: 105, cy: 70, r: 12 }, s), r2 = svg('circle', { 'class': 'ring', cx: 70, cy: 105, r: 12 }, s);
      function put(l, a, off) {
        var c = Math.cos(a), sn = Math.sin(a), ox = -sn * off, oy = c * off;
        l.setAttribute('x1', 100 + ox - c * 150); l.setAttribute('y1', 100 + oy - sn * 150);
        l.setAttribute('x2', 100 + ox + c * 150); l.setAttribute('y2', 100 + oy + sn * 150);
      }
      A.svm = function (t) {
        var u = cyc(t, 5), dec = Math.exp(-u * 6), a = Math.PI / 4 + .7 * Math.cos(u * 14) * dec, on = clamp((u - .45) / .15);
        put(ln, a, 0); put(m1, a, 24); put(m2, a, -24);
        m1.style.opacity = m2.style.opacity = r1.style.opacity = r2.style.opacity = on.toFixed(2);
      };
    })();

    /* Random forest: a case falls down a tree; three trees vote */
    (function () {
      var s = $('#anRf'), N = [[100, 26], [55, 78], [145, 78], [30, 132], [80, 132], [120, 132], [170, 132]];
      var E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]], ed = E.map(function (e) {
        return svg('line', { 'class': 'ed', x1: N[e[0]][0], y1: N[e[0]][1], x2: N[e[1]][0], y2: N[e[1]][1] }, s);
      });
      var nd = N.map(function (p, i) { return svg('circle', { 'class': i > 2 ? (i % 2 ? 'c0' : 'c1') : 'nd', cx: p[0], cy: p[1], r: i > 2 ? 11 : 10 }, s); });
      var dot = svg('circle', { 'class': 'cq', r: 7 }, s);
      svg('text', { x: 14, y: 182 }, s).textContent = 'votos';
      var votes = [0, 1, 2].map(function (i) { return svg('circle', { cx: 92 + i * 26, cy: 177, r: 9, 'class': 'nd' }, s); });
      var PATHS = [[0, 2, 6], [0, 1, 4], [0, 2, 5]];       /* leaves 6 and 4 are AD, 5 is CN: the vote ends 2-1 for AD */
      A.rf = function (t) {
        var T = 2.2, n = Math.floor(t / T) % 4, u = cyc(t, T);
        votes.forEach(function (v, i) { v.setAttribute('class', i < n ? (PATHS[i][2] === 5 ? 'c0' : 'c1') : 'nd'); });
        if (n === 3) { dot.style.opacity = 0; ed.forEach(function (e) { e.setAttribute('class', 'ed'); }); return; }
        var P = PATHS[n], seg = Math.min(1, Math.floor(u * 2.6)), f = clamp(u * 2.6 - seg), a = N[P[seg]], b = N[P[Math.min(2, seg + 1)]];
        dot.style.opacity = 1;
        dot.setAttribute('cx', a[0] + (b[0] - a[0]) * f); dot.setAttribute('cy', a[1] + (b[1] - a[1]) * f);
        E.forEach(function (e, i) {
          var hot = (e[0] === P[0] && e[1] === P[1]) || (seg >= 1 && e[0] === P[1] && e[1] === P[2]);
          ed[i].setAttribute('class', hot ? 'ed hot' : 'ed');
        });
      };
    })();

    /* KNN: a new case looks for its 3 nearest neighbours and takes the majority class */
    (function () {
      var s = $('#anKnn');
      var P = [[70, 85, 0], [110, 70, 1], [95, 135, 1], [140, 125, 0], [40, 40, 0], [160, 170, 0], [30, 120, 0], [160, 40, 1], [172, 92, 1], [50, 178, 1]];
      var dots = P.map(function (p) { return svg('circle', { 'class': 'c' + p[2], cx: p[0], cy: p[1], r: 8 }, s); });
      var near = [0, 1, 2], rings = near.map(function (i) { return svg('circle', { 'class': 'ring', cx: P[i][0], cy: P[i][1], r: 13 }, s); });
      var halo = svg('circle', { 'class': 'mg', cx: 100, cy: 100, fill: 'none' }, s), q = svg('circle', { 'class': 'cq', cx: 100, cy: 100, r: 9 }, s);
      A.knn = function (t) {
        var u = cyc(t, 4.2), g = clamp(u / .35), on = u > .35 && u < .92;
        halo.setAttribute('r', (40 * (1 - Math.pow(1 - g, 3))).toFixed(1));
        halo.style.opacity = u < .92 ? 1 : 0;
        rings.forEach(function (r) { r.style.opacity = on ? 1 : 0; });
        q.setAttribute('class', u > .55 && u < .92 ? 'c1' : 'cq');
      };
    })();

    /* Deep neural network: activity flows layer by layer to the output */
    (function () {
      var s = $('#anDnn'), X = [28, 76, 124, 172], C = [3, 4, 4, 2], L = [], E = [];
      X.forEach(function (x, li) { var l = []; for (var i = 0; i < C[li]; i++) l.push([x, 100 + (i - (C[li] - 1) / 2) * 38]); L.push(l); });
      for (var li = 0; li < 3; li++) L[li].forEach(function (a) { L[li + 1].forEach(function (b) { E.push([li, svg('line', { 'class': 'ed', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, s)]); }); });
      var nodes = []; L.forEach(function (l, li) { l.forEach(function (p, i) { nodes.push([li, i, svg('circle', { 'class': 'nd', cx: p[0], cy: p[1], r: 11 }, s)]); }); });
      A.dnn = function (t) {
        var u = cyc(t, 3.2), cur = Math.floor(u * 5);        /* 0..3 layers, 4 = result held */
        E.forEach(function (e) { e[1].setAttribute('class', e[0] === cur ? 'ed hot' : 'ed'); });
        nodes.forEach(function (n) {
          var on = n[0] === cur || (cur === 4 && n[0] === 3 && n[1] === 1);
          n[2].setAttribute('class', on ? (cur === 4 ? 'nd c1' : 'nd ndon') : 'nd');
        });
      };
    })();

    /* CNN: a 3x3 window slides over the input and fills the feature map */
    (function () {
      var s = $('#anCnn'), ins = [], outs = [], i, j, seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (j = 0; j < 6; j++) for (i = 0; i < 6; i++) {
        var gv = Math.round(70 + rnd() * 150);
        ins.push(svg('rect', { x: 8 + i * 16, y: 52 + j * 16, width: 16, height: 16, fill: 'rgb(' + gv + ',' + gv + ',' + gv + ')', stroke: '#F1F4F7', 'stroke-width': 1 }, s));
      }
      for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) outs.push(svg('rect', { 'class': 'cell', x: 128 + i * 16, y: 68 + j * 16, width: 16, height: 16 }, s));
      var win = svg('rect', { x: 8, y: 52, width: 48, height: 48, fill: 'none', stroke: '#E0A22E', 'stroke-width': 3.5, rx: 3 }, s);
      var link = svg('line', { stroke: '#E0A22E', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, s);
      svg('text', { x: 8, y: 40 }, s).textContent = 'imagen';
      svg('text', { x: 128, y: 56 }, s).textContent = 'mapa';
      A.cnn = function (t) {
        var u = cyc(t, 6.4), n = Math.min(16, Math.floor(u * 20)), p = Math.min(15, n), px = p % 4, py = Math.floor(p / 4);
        win.setAttribute('x', 8 + px * 16); win.setAttribute('y', 52 + py * 16);
        link.setAttribute('x1', 56 + px * 16); link.setAttribute('y1', 76 + py * 16);
        link.setAttribute('x2', 128 + px * 16); link.setAttribute('y2', 76 + py * 16);
        win.style.opacity = link.style.opacity = n < 16 ? 1 : 0;
        outs.forEach(function (o, k2) { o.setAttribute('class', k2 < n ? 'c0' : 'cell'); o.style.opacity = k2 < n ? (.35 + .65 * ((k2 * 7) % 5) / 4).toFixed(2) : 1; });
      };
    })();

    /* LSTM: steps of a sequence are read one by one while a memory line carries what came before */
    (function () {
      var s = $('#anLstm'), BX = [14, 61, 108, 155], boxes = [], ups = [];
      svg('line', { 'class': 'ed', x1: 8, y1: 66, x2: 192, y2: 66, 'stroke-width': 4 }, s);
      svg('text', { x: 8, y: 50 }, s).textContent = 'memoria';
      BX.forEach(function (x, i) {
        boxes.push(svg('rect', { 'class': 'cell', x: x, y: 120, width: 32, height: 32, rx: 6 }, s));
        svg('ellipse', { cx: x + 16, cy: 136, rx: 10, ry: 8, fill: 'none', stroke: '#9AA3B2', 'stroke-width': 2 }, s);
        ups.push(svg('line', { 'class': 'ed', x1: x + 16, y1: 118, x2: x + 16, y2: 70 }, s));
        svg('text', { x: x + 10, y: 175 }, s).textContent = 't' + (i + 1);
      });
      var mem = svg('circle', { 'class': 'cq', cy: 66, r: 8 }, s);
      var out = svg('text', { x: 150, y: 50, 'class': 'out' }, s); out.textContent = '→ AD';
      A.lstm = function (t) {
        var u = cyc(t, 4.4), x = 8 + clamp(u / .8) * 184, done = u > .8;
        mem.setAttribute('cx', x.toFixed(1));
        mem.setAttribute('r', (6 + 6 * clamp(u / .8)).toFixed(1));      /* the memory grows as it reads more steps */
        BX.forEach(function (bx, i) {
          var on = x >= bx + 16 - 6;
          boxes[i].setAttribute('class', on ? 'cell lit' : 'cell');
          ups[i].setAttribute('class', on && x < bx + 60 ? 'ed hot' : 'ed');
        });
        out.style.opacity = done ? 1 : 0;
      };
    })();

    TICK.sota = function (t) { for (k in A) A[k](t); };
    for (k in A) A[k](0);
  })();

  /* ---------------- 08 procesamiento: six preprocessing steps animated on real OASIS images ---------------- */
  (function () {
    var wp = $('#pcBias .wp'), hd = $('#pcBias .hd2'), sk = $('#pcSkull .sk'), mv = $('#pcReg .mv');
    var segT = $$('#pcSeg .t'), segL = $('#pcSegL'), ent = $('#pcEnt .sprite'), bar = $('#pcEntBar'), aug = $('#pcAugI'), augL = $('#pcAugL');
    var E = D.entropy || {}, sp = E.sprite || {}, curve = E.curve || [], mx = Math.max.apply(null, curve.concat([1]));
    var SEG = ['líquido', 'materia gris', 'materia blanca', 'los tres'];
    var AUG = [['original', 'none', 'none'], ['rotación', 'rotate(14deg)', 'none'], ['volteo', 'scaleX(-1)', 'none'], ['zoom', 'scale(1.35)', 'none'], ['brillo', 'none', 'brightness(1.7)']];
    aug.style.transition = 'transform .6s ease, filter .6s ease';
    var lastAug = -1;
    TICK.proc = function (t) {
      /* bias field: the corrected image is wiped back and forth over the corrupted one */
      var pct = 8 + (Math.sin(t * 1.1) * .5 + .5) * 84;
      wp.style.clipPath = 'inset(0 0 0 ' + pct.toFixed(1) + '%)';
      hd.style.transform = 'translateX(' + (pct * 2.5).toFixed(1) + 'px)';
      /* skull stripping: skull and skin fade away, then come back */
      var u = (t % 4.5) / 4.5;
      sk.style.opacity = (u < .25 ? 1 : u < .45 ? 1 - (u - .25) / .2 : u < .8 ? 0 : (u - .8) / .2).toFixed(2);
      /* registration: a misaligned brain eases onto the template outline */
      var r = (t % 4) / 4, k = 1 - ease(clamp(r / .55));
      mv.style.transform = 'translate(' + (22 * k).toFixed(1) + 'px,' + (-16 * k).toFixed(1) + 'px) rotate(' + (18 * k).toFixed(1) + 'deg) scale(' + (1 - .2 * k).toFixed(3) + ')';
      /* segmentation: one tissue at a time, then all three */
      var si = Math.floor((t % 6.4) / 1.6);
      segT.forEach(function (o, i) { o.style.opacity = si === 3 || si === i ? 1 : 0; });
      segL.textContent = SEG[si];
      /* entropy: the slice sweep with its information meter */
      if (ent._m) {
        var f = pingpong(t, 5, ent._m.frames), z = (sp.z || [])[f];
        setFrame(ent, f);
        bar.style.transform = 'scaleX(' + ((curve[z] || 0) / mx).toFixed(3) + ')';
      }
      /* augmentation: the same slice rotated, flipped, zoomed and brightened */
      var ai = Math.floor(t / 1.5) % AUG.length;
      if (ai !== lastAug) { lastAug = ai; aug.style.transform = AUG[ai][1]; aug.style.filter = AUG[ai][2]; augL.textContent = AUG[ai][0]; }
    };
  })();

  /* ---------------- 10 cnn: 0 big input + kernel, 1 the kernel sweeps, 2 many filters, 3 architecture ---------------- */
  (function () {
    var F = [
      ['fm_vert', ['−1', '0', '1', '−2', '0', '2', '−1', '0', '1']],
      ['fm_horz', ['−1', '−2', '−1', '0', '0', '0', '1', '2', '1']],
      ['fm_dark', ['−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑']],
      ['fm_diag1', ['0', '1', '2', '−1', '0', '1', '−2', '−1', '0']],
      ['fm_diag2', ['2', '1', '0', '1', '0', '−1', '0', '−1', '−2']],
      ['fm_lap', ['0', '−1', '0', '−1', '4', '−1', '0', '−1', '0']],
      ['fm_emb', ['−2', '−1', '0', '−1', '1', '1', '0', '1', '2']],
      ['fm_blur', ['1', '2', '1', '2', '4', '2', '1', '2', '1']]
    ];
    var K = $('#cnK'), M = $('#cnMask'), kern = $('#cnKern'), fan = $('#cnFan'), W = 720, H = 360, B = 44, R = 9, SWEEP = 5.5, HOLD = 1.4;
    var cells = [], i;
    for (i = 0; i < 9; i++) { var c = document.createElement('span'); kern.appendChild(c); cells.push(c); }
    function showK(n) { F[n][1].forEach(function (v, j) { cells[j].textContent = v; cells[j].className = v.charAt(0) === '−' ? 'n' : (v === '0' ? '' : 'p'); }); }
    showK(0);
    F.forEach(function (f, n) {
      var im = document.createElement('img');
      im.src = G + f[0] + '.png'; im.alt = '';
      place(im, n);
    });
    var more = document.createElement('div'); more.className = 'more'; more.textContent = '···'; place(more, 8);
    function place(el, n) {      /* 3 x 3 grid; each tile flies out of the centre */
      var x = (n % 3) * 244, y = Math.floor(n / 3) * 126;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dx', (360 - (x + 116)) + 'px'); el.style.setProperty('--dy', (184 - (y + 58)) + 'px'); el.style.setProperty('--i', n);
      fan.appendChild(el);
    }
    /* architecture: input -> conv -> pool -> conv -> pool -> dense -> output */
    var A = $('#cnArch'), defs = svg('defs', {}, A), mkr = svg('marker', { id: 'cnArrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
    svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#6B7280' }, mkr);
    var root = svg('g', { transform: 'translate(71 4) scale(1.45)' }, A), CY = 100, gi = 0;
    function grp(lbl, x) { var g = svg('g', { 'class': 'ab' }, root); g.style.setProperty('--i', gi++); svg('text', { 'class': 't', x: x, y: 222, 'text-anchor': 'middle' }, g).textContent = lbl; return g; }
    var g0 = grp('entrada', 90); svg('image', { href: G + 'dementia_md.jpg', x: 0, y: CY - 45, width: 180, height: 90, preserveAspectRatio: 'none' }, g0);
    function slabs(lbl, x0, n, w, h, pl) { var g = grp(lbl, x0 + (n - 1) * 7 + w / 2); for (var k = 0; k < n; k++) svg('rect', { 'class': 'sl' + (pl ? ' pl' : ''), x: x0 + k * 14, y: CY - h / 2 - k * 4 + n * 2, width: w, height: h, rx: 3 }, g); return x0 + (n - 1) * 14 + w; }
    function arrow(a, b) { var g = svg('g', { 'class': 'ab' }, root); g.style.setProperty('--i', gi++); svg('line', { 'class': 'ar', x1: a, y1: CY, x2: b, y2: CY }, g); }
    arrow(192, 252); var e1 = slabs('convolución', 262, 4, 18, 130, false);
    arrow(e1 + 14, e1 + 70); var e2 = slabs('pooling', e1 + 80, 4, 16, 86, true);
    arrow(e2 + 14, e2 + 70); var e3 = slabs('convolución', e2 + 80, 6, 14, 76, false);
    arrow(e3 + 14, e3 + 70); var e4 = slabs('pooling', e3 + 80, 6, 12, 48, true);
    arrow(e4 + 14, e4 + 70);
    var gd = grp('capa densa', e4 + 100); for (i = 0; i < 6; i++) svg('circle', { 'class': 'nn', cx: e4 + 100, cy: CY - 75 + i * 30, r: 11 }, gd);
    arrow(e4 + 125, e4 + 185);
    var go = grp('salida', e4 + 230);
    svg('text', { 'class': 'o', x: e4 + 230, y: CY - 14, 'text-anchor': 'middle', fill: '#9AA3B2' }, go).textContent = 'CN';
    svg('text', { 'class': 'o', x: e4 + 230, y: CY + 34, 'text-anchor': 'middle', fill: '#7D7ECA' }, go).textContent = 'AD';
    var pulse = svg('circle', { 'class': 'pulse', cx: 192, cy: CY, r: 8 }, root), PX = [192, e4 + 185];

    var step = 0, t0 = 0;
    SH.cnn = function (sc, s) { step = s; if (s <= 1) { t0 = 0; showK(0); } };
    SH.cnn.reset = function () { t0 = 0; step = 0; K.style.opacity = 0; showK(0); };
    TICK.cnn = function (t) {
      if (step >= 3) { var pu = (t % 2.6) / 2.6; pulse.setAttribute('cx', (PX[0] + (PX[1] - PX[0]) * pu).toFixed(1)); }
      if (step < 1) { K.style.opacity = 0; M.style.clipPath = 'none'; return; }
      if (!t0) t0 = t;
      var e = t - t0 - 1.1;                        /* wait for the image to settle */
      if (e < 0) { K.style.opacity = 0; return; }
      if (step >= 2) showK(Math.floor(e / .45) % F.length);
      var u = (e % (SWEEP + HOLD)) / SWEEP;
      if (u >= 1) { M.style.clipPath = 'inset(100% 0 0 0)'; K.style.opacity = 0; return; }
      K.style.opacity = 1;
      var row = Math.floor(u * R), fx = u * R - row, y = row * (H - B) / (R - 1), x = fx * (W - B);
      K.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      var rh = H / R, y0 = row * rh, y1 = y0 + rh, mx = fx * W;
      M.style.clipPath = 'polygon(' + mx + 'px ' + y0 + 'px,' + W + 'px ' + y0 + 'px,' + W + 'px ' + H + 'px,0 ' + H + 'px,0 ' + y1 + 'px,' + mx + 'px ' + y1 + 'px)';
    };
  })();

  /* ---------------- 11 transformer: 0 next-word prediction with attention, 1 how it sits on top of a CNN ---------------- */
  (function () {
    var title = $('#trT');
    SH.trf = function (sc, s) { title.innerHTML = s >= 2 ? 'Mecanismo de <em>atención</em>' : s ? 'Transformer <em>+ CNN</em>' : 'Transformer: <em>predecir la siguiente palabra</em>'; };

    /* words */
    var Wv = $('#trW'), BASE = ['El', 'Alzheimer', 'afecta', 'primero', 'a', 'la'];
    var P = [
      { w: 'memoria', wts: [.08, .9, .45, .6, .15, .7], pr: [['memoria', .62], ['corteza', .21], ['vida', .09]] },
      { w: 'reciente', wts: [.05, .5, .3, .35, .1, .25, .95], pr: [['reciente', .48], ['y', .30], ['primero', .08]] }
    ];
    function tw(s) { return s.length * 22 + 56; }
    svg('text', { 'class': 'cap2', x: 832, y: 110, 'text-anchor': 'middle' }, Wv).textContent = 'auto-atención: la palabra nueva mira a las anteriores';
    var layer = svg('g', {}, Wv), built = -1, parts = null, Y = 300, TH = 64;
    function build(ci) {
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      var words = BASE.concat(P.slice(0, ci).map(function (p) { return p.w; })), x = 83, toks = [];
      words.forEach(function (w) {
        var wd = tw(w);
        svg('rect', { 'class': 'tok', x: x, y: Y, width: wd, height: TH, rx: 14 }, layer);
        svg('text', { 'class': 'tt', x: x + wd / 2, y: Y + 46, 'text-anchor': 'middle' }, layer).textContent = w;
        toks.push([x + wd / 2, wd]); x += wd + 18;
      });
      var cur = P[ci], sw = tw(cur.w), sx = x + sw / 2;
      var slot = svg('rect', { 'class': 'slot', x: x, y: Y, width: sw, height: TH, rx: 14 }, layer);
      var q = svg('text', { 'class': 'q', x: sx, y: Y + 48, 'text-anchor': 'middle' }, layer); q.textContent = '?';
      var arcs = toks.map(function (tk, i) {
        var w = cur.wts[i], d = Math.abs(sx - tk[0]);
        var a = svg('path', { 'class': 'arc', d: 'M' + sx + ' ' + Y + ' Q' + ((sx + tk[0]) / 2) + ' ' + (Y - 50 - d * .22) + ' ' + tk[0] + ' ' + Y, 'stroke-width': (1.5 + 9 * w).toFixed(1), 'stroke-opacity': (.25 + .75 * w).toFixed(2), pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, layer);
        var b = svg('rect', { 'class': 'wt', x: tk[0] - (tk[1] - 24) / 2, y: Y + TH + 12, width: 0, height: 8, rx: 4 }, layer);
        return [a, b, (tk[1] - 24) * w];
      });
      var prs = cur.pr.map(function (p, i) {
        var yy = Y + 150 + i * 46;
        svg('text', { 'class': 'pl', x: sx - 150, y: yy + 8, 'text-anchor': 'end' }, layer).textContent = p[0];
        svg('rect', { 'class': 'pb', x: sx - 130, y: yy - 10, width: 260, height: 20, rx: 10 }, layer);
        var f = svg('rect', { 'class': 'pf', x: sx - 130, y: yy - 10, width: 0, height: 20, rx: 10 }, layer);
        var tx = svg('text', { 'class': 'pl', x: sx + 146, y: yy + 8 }, layer); tx.textContent = Math.round(p[1] * 100) + ' %';
        return [f, p[1], tx];
      });
      var fillT = svg('text', { 'class': 'tt', x: sx, y: Y + 46, 'text-anchor': 'middle' }, layer); fillT.textContent = cur.w;
      parts = { slot: slot, q: q, arcs: arcs, prs: prs, fillT: fillT, probG: [] };
    }
    var CYC = 6.5;
    TICK.trf = function (t) {
      var ci = Math.floor(t / CYC) % P.length, u = (t % CYC) / CYC * CYC;
      if (ci !== built) { built = ci; build(ci); }
      var a = clamp((u - .6) / 2), pr = clamp((u - 2.6) / 1.4), done = u > 4.3, fade = clamp((u - 4.3) / .6);
      parts.slot.style.opacity = clamp(u / .6).toFixed(2);
      parts.slot.setAttribute('class', done ? 'tok new' : 'slot');
      parts.q.style.opacity = done ? 0 : clamp(u / .6);
      parts.fillT.style.opacity = done ? 1 : 0;
      parts.arcs.forEach(function (r) {
        r[0].setAttribute('stroke-dashoffset', (1 - a).toFixed(3)); r[0].style.opacity = (1 - fade).toFixed(2);
        r[1].setAttribute('width', (r[2] * a).toFixed(1)); r[1].style.opacity = (1 - fade).toFixed(2);
      });
      parts.prs.forEach(function (p) { p[0].setAttribute('width', (260 * p[1] * pr).toFixed(1)); });
    };

    /* hybrid: image -> CNN -> patches -> tokens -> transformer -> CN/AD */
    var Hs = $('#trH'), hd = svg('defs', {}, Hs), hm = svg('marker', { id: 'trArrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, hd);
    svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#6B7280' }, hm);
    var CY2 = 280;
    svg('image', { href: G + 'dementia_md.jpg', x: 0, y: CY2 - 75, width: 300, height: 150, preserveAspectRatio: 'none' }, Hs);
    svg('text', { 'class': 'cap2', x: 150, y: CY2 + 115, 'text-anchor': 'middle' }, Hs).textContent = 'resonancia';
    svg('line', { 'class': 'har', x1: 310, y1: CY2, x2: 370, y2: CY2 }, Hs);
    svg('rect', { 'class': 'blk', x: 380, y: CY2 - 70, width: 150, height: 140, rx: 16 }, Hs);
    svg('text', { 'class': 'bt', x: 455, y: CY2 + 10, 'text-anchor': 'middle' }, Hs).textContent = 'CNN';
    svg('text', { 'class': 'cap2', x: 455, y: CY2 + 115, 'text-anchor': 'middle' }, Hs).textContent = 'patrones locales';
    svg('line', { 'class': 'har', x1: 540, y1: CY2, x2: 600, y2: CY2 }, Hs);
    svg('text', { 'class': 'cap2', x: 682, y: CY2 + 115, 'text-anchor': 'middle' }, Hs).textContent = 'parches';
    svg('rect', { 'class': 'blk tf', x: 830, y: CY2 - 150, width: 520, height: 300, rx: 22 }, Hs);
    svg('text', { 'class': 'bt', x: 1090, y: CY2 - 104, 'text-anchor': 'middle' }, Hs).textContent = 'Transformer';
    svg('text', { 'class': 'cap2', x: 1090, y: CY2 + 115, 'text-anchor': 'middle' }, Hs).textContent = 'parches = palabras';
    svg('line', { 'class': 'har', x1: 1360, y1: CY2, x2: 1420, y2: CY2 }, Hs);
    var oCN = svg('text', { 'class': 'ho', x: 1480, y: CY2 - 18, 'text-anchor': 'middle', fill: '#9AA3B2' }, Hs); oCN.textContent = 'CN';
    var oAD = svg('text', { 'class': 'ho', x: 1480, y: CY2 + 40, 'text-anchor': 'middle', fill: '#9AA3B2' }, Hs); oAD.textContent = 'AD';
    var arcG = svg('g', {}, Hs), PAIRS = [[0, 5, .9], [1, 6, .7], [2, 5, .5], [3, 7, .35], [0, 3, .6], [4, 6, .45], [1, 4, .3]], arcs2 = [];
    var tks = [], OP = [.95, .55, .8, .4, .7, .9, .5, .65];
    for (var n = 0; n < 8; n++) {
      var gx = 610 + (n % 4) * 36, gy = CY2 - 36 + Math.floor(n / 4) * 36, tx = 862 + n * 58, ty = CY2 - 10;
      tks.push([svg('rect', { 'class': 'ptk', width: 34, height: 34, rx: 6, fill: '#00706F', 'fill-opacity': OP[n] }, Hs), gx, gy, tx, ty]);
    }
    PAIRS.forEach(function (p) {
      var a = tks[p[0]], b = tks[p[1]], ax = a[3] + 17, bx = b[3] + 17, h = 30 + Math.abs(bx - ax) * .25;
      arcs2.push([svg('path', { 'class': 'harc', d: 'M' + ax + ' ' + (a[4]) + ' Q' + ((ax + bx) / 2) + ' ' + (a[4] - h) + ' ' + bx + ' ' + b[4], 'stroke-width': (1 + 4 * p[2]).toFixed(1) }, arcG), p[2]]);
    });
    TICK.trf2 = function (t) {
      var u = (t % 6) / 6, m = ease(clamp(u / .35));
      tks.forEach(function (k, i) {
        var d = clamp(m * 1.25 - i * .03);
        k[0].setAttribute('x', (k[1] + (k[3] - k[1]) * d).toFixed(1)); k[0].setAttribute('y', (k[2] + (k[4] - k[2]) * d).toFixed(1));
      });
      var ar = clamp((u - .38) / .3);
      arcs2.forEach(function (a, i) { a[0].style.opacity = (ar * (.35 + .65 * a[1]) * (.75 + .25 * Math.sin(t * 3 + i))).toFixed(2); });
      oAD.setAttribute('fill', u > .78 ? '#7D7ECA' : '#9AA3B2');
    };
    var tw0 = TICK.trf;
    TICK.trf = function (t, sc) { tw0(t, sc); TICK.trf2(t); };
  })();

  /* ---------------- 08 atención (third step of the transformer scene): one patch attends to all others; illustrative attention map ---------------- */
  (function () {
    var s = $('#atSvg'), C = 8, Rr = 4, P = 62, q = [3, 1], i, j;
    function wt(x, y) {     /* illustrative: strongest on the ventricles, some on the cortex rim */
      var v = Math.exp(-(Math.pow((x - 205) / 70, 2) + Math.pow((y - 124) / 48, 2)));
      var rr = Math.sqrt(Math.pow((x - 215) / 155, 2) + Math.pow((y - 125) / 108, 2));
      return Math.min(1, v + .45 * Math.exp(-Math.pow(rr - .9, 2) / .006));
    }
    for (i = 1; i < C; i++) svg('line', { 'class': 'gd', x1: i * P, x2: i * P, y1: 0, y2: 248 }, s);
    for (j = 1; j < Rr; j++) svg('line', { 'class': 'gd', x1: 0, x2: 496, y1: j * P, y2: j * P }, s);
    var qx = q[0] * P + P / 2, qy = q[1] * P + P / 2;
    for (j = 0; j < Rr; j++) for (i = 0; i < C; i++) {
      if (i === q[0] && j === q[1]) continue;
      var cx = i * P + P / 2, cy = j * P + P / 2, w = wt(cx, cy);
      svg('line', { 'class': 'ln', x1: qx, y1: qy, x2: cx, y2: cy, 'stroke-width': (.4 + 4.2 * w).toFixed(2), 'stroke-opacity': (.12 + .88 * w).toFixed(2) }, s);
    }
    svg('rect', { 'class': 'q', x: q[0] * P + 1.5, y: q[1] * P + 1.5, width: P - 3, height: P - 3, rx: 4 }, s);
    /* heat map: same weight function per pixel, coloured black -> indigo -> red -> amber -> yellow */
    var cv = $('#atHeat'), g = cv.getContext('2d'), im = g.createImageData(496, 248), d = im.data;
    var stops = [[0, 0, 0, 0], [.35, 61, 53, 139], [.6, 194, 56, 75], [.8, 224, 162, 46], [1, 255, 236, 140]];
    function ramp(t) {
      for (var k = 1; k < stops.length; k++) if (t <= stops[k][0]) {
        var a = stops[k - 1], b = stops[k], u = (t - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
      }
      return stops[stops.length - 1].slice(1);
    }
    for (var y = 0; y < 248; y++) for (var x = 0; x < 496; x++) {
      var c = ramp(wt(x, y)), o = (y * 496 + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  })();


  /* ================= engine ================= */
  var stage = $('#stage');
  var scenes = $$('.scene', stage);
  var cur = 0, step = 0, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countTo(el, to, dec) {
    if (to == null) return;
    function put(v) { el.textContent = fmt(v, dec); }
    if (reduce) { put(to); return; }
    var t0 = performance.now();
    (function f(t) { var p = Math.min(1, (t - t0) / 1300), e = 1 - Math.pow(1 - p, 3); put(to * e); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function maxStep(sc) { var m = 0; $$('[data-s]', sc).forEach(function (e) { m = Math.max(m, +e.getAttribute('data-s')); }); return m; }
  function onIn(e) {
    if (e.hasAttribute('data-count')) countTo(e, +e.getAttribute('data-count'), 0);
    $$('[data-count]', e).forEach(function (c) { countTo(c, +c.getAttribute('data-count'), 0); });
  }
  function clearScene(sc) {
    sc.removeAttribute('data-step');
    for (var q = 1; q <= 8; q++) sc.classList.remove('st' + q);
    if (SH[sc.id] && SH[sc.id].reset) SH[sc.id].reset(sc);
    $$('[data-s].in', sc).forEach(function (e) { e.classList.remove('in'); });
  }
  function render() {
    scenes.forEach(function (sc, i) { sc.classList.toggle('on', i === cur); });
    var sc = scenes[cur];
    sc.setAttribute('data-step', step);
    for (var q = 1; q <= 8; q++) sc.classList.toggle('st' + q, step >= q);
    if (SH[sc.id]) { try { SH[sc.id](sc, step); } catch (err) { console.error(err); } }
    $$('[data-s]', sc).forEach(function (e) {
      var on = +e.getAttribute('data-s') <= step;
      if (on && !e.classList.contains('in')) { e.classList.add('in'); onIn(e); }
      else if (!on && e.classList.contains('in')) e.classList.remove('in');
    });
    stage.classList.toggle('isdark', sc.classList.contains('dark'));
    set('pg', (cur + 1 < 10 ? '0' : '') + (cur + 1) + ' / ' + scenes.length);
    var total = 0, done = 0;
    scenes.forEach(function (s, i) { var m = maxStep(s) + 1; total += m; if (i < cur) done += m; else if (i === cur) done += step + 1; });
    $('#prog').style.width = (done / total * 100) + '%';
    $('#hint').style.opacity = (cur === 0 && step === 0) ? .9 : 0;
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { }
  }
  function go(n, atEnd) {
    if (n < 0 || n >= scenes.length) return;
    var from = cur; cur = n;
    if (from !== n) {
      var old = scenes[from];
      old.classList.add('leaving');
      setTimeout(function () { old.classList.remove('leaving'); if (scenes[cur] !== old) clearScene(old); }, 1500);
    }
    clearScene(scenes[cur]);
    if (from !== n && scenes[cur].getAttribute('data-tr') === 'tiles' && !reduce) tiles(scenes[cur]);
    step = atEnd ? maxStep(scenes[cur]) : 0;
    setTimeout(render, 34);   /* one frame later, so the cleared scene restarts its transitions */
  }
  var exiting = false;
  function next() {
    if (exiting) return;
    var m = maxStep(scenes[cur]);
    if (step < m) { step++; render(); return; }
    if (scenes[cur].id === 'cover' && !reduce) {          /* the brain's lines fly apart, then the next scene opens */
      exiting = true; scenes[cur].classList.add('exit');
      setTimeout(function () { exiting = false; go(cur + 1, false); }, 1150);
      return;
    }
    go(cur + 1, false);
  }
  function tiles(sc) {         /* patch transition: tiles cover the stage, the scene swaps, tiles fall away */
    var ov = document.createElement('div'), bg = getComputedStyle(sc).backgroundColor, x, y;
    ov.className = 'tiles';
    for (y = 0; y < 9; y++) for (x = 0; x < 16; x++) {
      var c = document.createElement('i'), r = Math.random();
      c.style.background = r < .12 ? '#00706F' : r < .2 ? '#3D358B' : bg;
      c.style.setProperty('--d', ((x + y) * .028 + Math.random() * .08).toFixed(3) + 's');
      ov.appendChild(c);
    }
    stage.appendChild(ov);
    setTimeout(function () { ov.remove(); }, 2400);
  }
  function prev() { if (step > 0) { step--; render(); } else if (cur > 0) go(cur - 1, true); }

  document.addEventListener('keydown', function (e) {
    if (['ArrowRight', ' ', 'Enter', 'PageDown', 'ArrowDown'].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0, false);
    else if (e.key === 'End') go(scenes.length - 1, true);
    else if (e.key === 'f') toggleFs();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('button, .noadv')) return;
    if (e.clientX < window.innerWidth * .28) prev(); else next();
  });
  var tx = null;
  document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
  }, { passive: true });
  function toggleFs() {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () { }); } catch (x) { }
  }
  $('#fs').addEventListener('click', function (e) { e.stopPropagation(); toggleFs(); });
  function fit() { var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080); stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')'; }
  window.addEventListener('resize', fit); fit();

  (function loop(now) {
    var sc = scenes[cur];
    if (!reduce && TICK[sc.id]) { try { TICK[sc.id](now / 1000, sc); } catch (err) { console.error(err); } }
    requestAnimationFrame(loop);
  })(performance.now());

  var h = parseInt((location.hash || '').slice(1), 10);
  if (h >= 1 && h <= scenes.length) cur = h - 1;
  setTimeout(render, 50);
  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').slice(1), 10) - 1;
    if (n >= 0 && n < scenes.length && n !== cur) go(n, false);
  });
  /* go to slide n (1-based) at its last step, e.g. DECK.show(7) from the console */
  window.DECK = { next: next, prev: prev, show: function (n) { go(n - 1, true); },
    setStep: function (n) { step = Math.max(0, Math.min(maxStep(scenes[cur]), n)); render(); } };
})();
