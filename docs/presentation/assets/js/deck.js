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
    SH.cover.reset = function () { running = false; g.clearRect(0, 0, 1920, 1080); sc.classList.remove('dna-done', 'pins', 'word'); };
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

  /* ---------------- 06 cómo viene una RM: the three planes sweep through the volume ---------------- */
  TICK.rm = function (t, sc) {
    $$('.sprite', sc).forEach(function (el, i) { if (el._m) setFrame(el, pingpong(t + i * 1.3, 11, el._m.frames)); });
  };

  /* ---------------- 07 atrofia: real scans at the same brain level, one per CDR level ---------------- */
  (function () {
    var lv = [['nd', 'Sano', 'CDR 0'], ['vmd', 'Muy leve', 'CDR 0.5'], ['md', 'Leve', 'CDR 1'], ['mod', 'Moderada', 'CDR 2']];
    var wrap = $('#dmThumbs'), big = $('#dmImg'), th = [];
    lv.forEach(function (l, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'th';
      b.innerHTML = '<img src="' + G + 'dementia_' + l[0] + '.jpg" alt=""><span><b>' + l[1] + '</b>' + l[2] + '</span>';
      b.addEventListener('click', function () { if (window.DECK) DECK.setStep(i); });
      wrap.appendChild(b); th.push(b);
    });
    SH.atrofia = function (sc, step) {
      var k = Math.min(step, 3), l = lv[k];
      th.forEach(function (b, i) { b.classList.toggle('on', i === k); });
      big.style.opacity = 0;
      setTimeout(function () { big.src = G + 'dementia_' + l[0] + '.jpg'; big.style.opacity = 1; }, 180);
      set('dmLbl', l[1] + ' · ' + l[2]);
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

  /* ---------------- 09 fuga: 6 people x 6 slices, split by image vs by person ---------------- */
  (function () {
    var wrap = $('#fgTiles'), COL = ['#00706F', '#A9CDE5', '#3D358B', '#7D7ECA', '#E0A22E', '#C2384B'];
    var DARKTXT = { 1: 1, 4: 1 }, tiles = [], p, k, S = 76;
    for (p = 0; p < 6; p++) for (k = 0; k < 6; k++) {
      var e = document.createElement('div');
      e.className = 'tl'; e.textContent = p + 1;
      e.style.background = COL[p]; e.style.color = DARKTXT[p] ? '#1F1F1F' : '#fff';
      wrap.appendChild(e); tiles.push({ el: e, p: p, k: k });
    }
    function place(t, x, y, dl) { t.el.style.setProperty('--dl', dl + 's'); t.el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function grid(list, x0, y0) { list.forEach(function (t, i) { place(t, x0 + (i % 6) * S, y0 + Math.floor(i / 6) * S, (i % 6) * .03 + Math.floor(i / 6) * .05); }); }
    /* fixed "random" split: 24 slices to training, 12 to testing, every person on both sides */
    var order = [3, 17, 8, 30, 22, 1, 13, 27, 5, 34, 19, 10, 25, 0, 32, 15, 7, 21, 28, 12, 35, 4, 18, 31, 9, 24, 2, 33, 14, 26, 6, 20, 11, 29, 16, 23];
    var rTrain = order.slice(0, 24).map(function (i) { return tiles[i]; }), rTest = order.slice(24).map(function (i) { return tiles[i]; });
    SH.fuga = function (sc, step) {
      if (step === 0) grid(tiles, 960 - 3 * S, 330);
      else if (step === 1) { grid(rTrain, 384, 365); grid(rTest, 1236, 441); }
      else { grid(tiles.filter(function (t) { return t.p < 4; }), 384, 365); grid(tiles.filter(function (t) { return t.p >= 4; }), 1236, 441); }
    };
    SH.fuga(null, 0);
  })();

  /* ---------------- 10 oasis: people per CDR level ---------------- */
  (function () {
    var O = (D.oasis1 && D.oasis1.by_class) || { nd: 316, vmd: 70, md: 28, mod: 2 };
    var L = [['nd', 'Sano', 'CDR 0', '#00706F'], ['vmd', 'Muy leve', 'CDR 0.5', '#A9CDE5'], ['md', 'Leve', 'CDR 1', '#7D7ECA'], ['mod', 'Moderada', 'CDR 2', '#FAFAFA']];
    var mx = Math.max.apply(null, L.map(function (l) { return O[l[0]]; })), box = $('#oaBars'), fills = [];
    L.forEach(function (l) {
      var r = document.createElement('div'); r.className = 'br';
      r.innerHTML = '<span>' + l[1] + '<small>' + l[2] + '</small></span><div class="tr"><i style="background:' + l[3] + '"></i></div><b>' + O[l[0]] + '</b>';
      box.appendChild(r); fills.push([$('i', r), Math.max(1.2, O[l[0]] / mx * 100)]);
    });
    SH.oasis = function (sc, step) { fills.forEach(function (f, i) { f[0].style.transitionDelay = (i * .15) + 's'; f[0].style.transform = 'scaleX(' + (step >= 1 ? f[1] / 100 : 0) + ')'; }); };
    SH.oasis.reset = function () { fills.forEach(function (f) { f[0].style.transform = 'scaleX(0)'; }); };
  })();

  /* ---------------- 12 cnn: a 3x3 filter sweeps the slice while its feature map is revealed ---------------- */
  (function () {
    var F = [
      ['fm_vert', 'bordes verticales', ['−1', '0', '1', '−2', '0', '2', '−1', '0', '1']],
      ['fm_horz', 'bordes horizontales', ['−1', '−2', '−1', '0', '0', '0', '1', '2', '1']],
      ['fm_dark', 'zonas oscuras (líquido)', ['−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑', '−⅑']]
    ];
    var K = $('#cnK'), M = $('#cnMask'), map = $('#cnMap'), kern = $('#cnKern'), W = 620, H = 310, B = 38, R = 9, SWEEP = 5.5, HOLD = 1.6;
    var cells = []; for (var i = 0; i < 9; i++) { var c = document.createElement('span'); kern.appendChild(c); cells.push(c); }
    var fi = -1, t0 = 0, multi = false;
    function useFilter(n) {
      if (n === fi) return; fi = n;
      map.src = G + F[n][0] + '.png'; set('cnLbl', 'Filtro 3×3 · ' + F[n][1]);
      F[n][2].forEach(function (v, j) { cells[j].textContent = v; cells[j].className = v.charAt(0) === '−' ? 'n' : (v === '0' ? '' : 'p'); });
    }
    useFilter(0);
    SH.cnn = function (sc, step) { multi = step >= 1; t0 = 0; if (!multi) useFilter(0); };
    SH.cnn.reset = function () { t0 = 0; };
    TICK.cnn = function (t) {
      if (!t0) t0 = t;
      var e = t - t0, cyc = Math.floor(e / (SWEEP + HOLD)), u = (e % (SWEEP + HOLD)) / SWEEP;
      if (multi) useFilter(cyc % 3);
      if (u >= 1) { M.style.clipPath = 'inset(100% 0 0 0)'; K.style.opacity = 0; return; }
      K.style.opacity = 1;
      var row = Math.floor(u * R), fx = (u * R - row), y = row * (H - B) / (R - 1), x = fx * (W - B);
      K.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      var rh = H / R, y0 = row * rh, y1 = y0 + rh, mx = fx * W;
      M.style.clipPath = 'polygon(' + mx + 'px ' + y0 + 'px,' + W + 'px ' + y0 + 'px,' + W + 'px ' + H + 'px,0 ' + H + 'px,0 ' + y1 + 'px,' + mx + 'px ' + y1 + 'px)';
    };
  })();

  /* ---------------- 13 atención: one patch attends to all others; illustrative attention map ---------------- */
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

  /* ---------------- 15 fin: helix ---------------- */
  TICK.fin = function (t) {
    var A = '', B = '', x;
    for (x = 0; x <= 1200; x += 10) {
      var y = 60 * Math.sin(x / 300 * 2 * Math.PI + t * 1.2);
      A += (x ? 'L' : 'M') + x + ' ' + (100 + y).toFixed(1);
      B += (x ? 'L' : 'M') + x + ' ' + (100 - y).toFixed(1);
    }
    $('#finA').setAttribute('d', A); $('#finB').setAttribute('d', B);
  };


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
    step = atEnd ? maxStep(scenes[cur]) : 0;
    setTimeout(render, 34);   /* one frame later, so the cleared scene restarts its transitions */
  }
  function next() { var m = maxStep(scenes[cur]); if (step < m) { step++; render(); } else go(cur + 1, false); }
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
