/* Game: caterpillar body, hero pose, play loop, metamorphosis, butterfly */
(() => {
'use strict';
const { clamp, lerp, ease, angDiff, rng, TAU, IMG, SEG, FOOD, DPR } = CP;
const PI = Math.PI;

const DAYS = CP.DAYS = [
  { day: 'Monday', what: 'he ate through one apple.', foods: ['apple'], tex: 'apple' },
  { day: 'Tuesday', what: 'he ate through two pears.', foods: ['pear', 'pear'], tex: 'pear', bundle: true },
  { day: 'Wednesday', what: 'he ate through three plums.', foods: ['plum', 'plum', 'plum'], tex: 'plum', bundle: true },
  { day: 'Thursday', what: 'he ate through four strawberries.', foods: Array(4).fill('strawberry'), tex: 'strawberry', bundle: true },
  { day: 'Friday', what: 'he ate through five oranges.', foods: Array(5).fill('orange'), tex: 'orange', bundle: true },
  { day: 'Saturday', what: 'he ate through one piece of chocolate cake, one ice-cream cone, one pickle, one slice of Swiss cheese, one lollipop, and one slice of watermelon.', short: 'cake, ice cream, pickle, cheese, lollipop & watermelon', foods: ['cake', 'icecream', 'pickle', 'cheese', 'lollipop', 'watermelon'], tex: 'pink', rows: 3 },
  { day: 'Sunday', what: 'he ate through one nice green leaf, and after that he felt much better.', foods: ['leaf'], tex: 'leaf' },
];
CP.TOTAL_FOODS = DAYS.reduce((a, d) => a + d.foods.length, 0);

class Game {
  constructor(cv, card, hooks = {}) {
    this.cv = cv; this.g = cv.getContext('2d'); this.card = card; this.hooks = hooks;
    this.t = 0; this.mode = 'idle'; this.particles = []; this.foods = [];
    this.trail = []; this.cum = []; this.phase = 0; this.wig = 0; this.nextWig = 5;
    this.face = 1; this.faceT = 1; this.blink = 0; this.nextBlink = 2.5; this.chomp = 0;
    this.R = 20; this.n = 9; this.nShow = 9; this.speed = 0; this.ripples = []; this.fat = 0;
    this.input = { down: false, x: 0, y: 0 }; this.auto = /[?&]auto=1/.test(location.search);
    this.bf = null; this.rng = rng(Date.now() & 0xffff);
    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindInput();
    this.last = performance.now();
    const loop = now => { const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.step(dt); this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  resize() {
    const r = this.card.getBoundingClientRect(); this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(this.W * DPR); this.cv.height = Math.round(this.H * DPR);
    this.fs = clamp(this.W / 390, .9, 1.25);
    this.layout();
    if (this.mode === 'hero') this.buildHero(false);
    if (this.mode === 'rest' && this.bf) Object.assign(this.bf, this.restPose());
  }
  layout() {
    const c = this.card.getBoundingClientRect(), o = document.getElementById('one').getBoundingClientRect();
    const inv = document.getElementById('invite'), hero = document.getElementById('hero'), hr = hero.getBoundingClientRect();
    this.glyph = { x: inv.offsetLeft + hero.offsetLeft + (o.left - hr.left), y: inv.offsetTop + hero.offsetTop + (o.top - hr.top), w: o.width, h: o.height };
    const hud = document.getElementById('hud');
    this.top = Math.max(110, (hud ? hud.offsetTop + hud.offsetHeight : 60) + 22);
  }
  // a tap sets where he is heading; he keeps going there after the finger lifts
  setTarget() { this.target = { x: clamp(this.input.x, -20, this.W + 20), y: clamp(this.input.y, this.top - 50, this.H), t: this.t }; }
  bottom() { return this.H - 78; }
  bindInput() {
    const pos = e => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.cv.addEventListener('pointerdown', e => { if (this.mode !== 'play') return; e.preventDefault(); this.cv.setPointerCapture(e.pointerId); [this.input.x, this.input.y] = pos(e); this.input.down = true; this.setTarget(); this.ripples.push({ x: this.input.x, y: this.input.y, t: this.t }); this.hooks.onTouch && this.hooks.onTouch(); });
    this.cv.addEventListener('pointermove', e => { if (!this.input.down) return; [this.input.x, this.input.y] = pos(e); this.setTarget(); });
    const up = () => { this.input.down = false; };
    this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
    this.keys = {};
    const KM = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R', W: 'U', S: 'D', A: 'L', D: 'R' };
    addEventListener('keydown', e => { const k = KM[e.key]; if (!k || this.mode !== 'play' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; this.keys[k] = 1; e.preventDefault(); this.hooks.onTouch && this.hooks.onTouch(); });
    addEventListener('keyup', e => { const k = KM[e.key]; if (k) delete this.keys[k]; });
    addEventListener('blur', () => { this.keys = {}; this.input.down = false; });
  }

  /* ---------- trail ---------- */
  setTrail(pts) { this.trail = pts.slice(); this.cum = [0]; for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
  push(x, y) { const p = this.trail[this.trail.length - 1]; const d = Math.hypot(x - p[0], y - p[1]); if (d < .5) return; this.trail.push([x, y]); this.cum.push(this.cum[this.cum.length - 1] + d);
    if (this.trail.length > 900) { const cut = 300; this.trail.splice(0, cut); this.cum.splice(0, cut); } }
  at(s) {
    const T = this.trail, C = this.cum, n = T.length;
    if (s <= C[0]) { const a = T[0], b = T[1] || [a[0] + 1, a[1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = (s - C[0]) / L; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    if (s >= C[n - 1]) return T[n - 1].slice();
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
    const k = (s - C[lo]) / ((C[hi] - C[lo]) || 1); return [lerp(T[lo][0], T[hi][0], k), lerp(T[lo][1], T[hi][1], k)];
  }

  /* ---------- hero: inchworm crawl along the foot of the "1", passing behind it ---------- */
  buildHero(entrance = true) {
    this.layout();
    const g = this.glyph, R = clamp(g.h * (CP.Rk || .1), 12, 26); this.R = R;
    const n = CP.nSeg || 15, L = R * .9 + (n - 1) * R, base = g.y + g.h - R * .78, A = L - R * (3.05 + (CP.nb ?? 1.4)), restRatio = CP.restRatio || .42;
    // resting pose from the invite art: arch centred on the stem of the "1", tail and head on the ground either side
    const stemX = g.x + g.w * (CP.oneStem || .55), headX = stemX + restRatio * A / 2 + R * (CP.headOff ?? 1.9);
    this.n = this.nShow = n;
    const pts = []; for (let x = -2000; x <= headX; x += 4) pts.push([x, base]);
    this.setTrail(pts); this.headS = this.cum[this.cum.length - 1];
    const tail0 = entrance ? -L - 40 : headX - L, dist = headX - L - tail0, cycles = entrance ? Math.max(3, Math.round(dist / (L * .5))) : 0;
    const D = cycles ? dist / cycles : 0, S = D || L * .5;
    this.inch = { t: entrance ? 0 : 99, L, base, headX, tail0, cycles, D, S, cyc: .95, gRest: (1 - restRatio) * A / S, neckRest: CP.neckRest ?? 1.25 };
    this.hero = { t: 0 }; this.mode = 'hero'; this.bf = null; this.foods = []; this.speed = 0; this.wig = 0; this.fat = 0; this.fatOn = 0;
  }
  // one inch cycle, read from the film: head plants, tail pulls up into a tall slinky loop, short hold, head reaches and the loop rolls out flat
  inchState() {
    const I = this.inch, T = I.cycles * I.cyc;
    if (I.t < T) {
      const i = Math.floor(I.t / I.cyc), c = (I.t % I.cyc) / I.cyc, H0 = I.tail0 + i * I.D + I.L;
      if (c < .42) { const e = ease.inOut(c / .42); return { g: e, anchor: 'head', ax: H0, lean: .34 * e, neck: 0, tilt: .14 * e }; }
      if (c < .5) { const e = (c - .42) / .08; return { g: 1 + .03 * Math.sin(PI * e), anchor: 'head', ax: H0, lean: .34, neck: 0, tilt: .14 }; }
      const e = ease.inOut((c - .5) / .5), w = Math.sin(PI * e);
      return { g: 1 - e, anchor: 'tail', ax: H0 - I.L + I.D, lean: .34 * (1 - e) - .5 * w, neck: .22 * w, tilt: .14 * (1 - e) - .22 * w };
    }
    const s = ease.inOut(clamp((I.t - T) / 1.1, 0, 1)), br = Math.sin(this.t * 1.3) * .03 * s;
    return { g: I.gRest * (s + br), anchor: 'head', ax: I.headX, lean: 0, neck: I.neckRest * s, nb: (CP.nb ?? 1.4) * s, tilt: (CP.rTilt ?? .1) * s };
  }
  inchSegs() {
    const I = this.inch, st = this.inchState(), R = this.R, L = I.L, a = R * .45, b = R * (2.6 + (st.nb || 0)), A = L - a - b;
    const ratio = clamp((A - st.g * I.S) / A, .06, 1);
    // the arch's tangent angle is -α·sin(2πu): its chord/length is J0(α), so solve α for the chord we need (keeps body length constant)
    const J = al => { let m = 0; for (let i = 0; i < 24; i++) m += Math.cos(al * Math.sin(TAU * (i + .5) / 24)); return m / 24; };
    let lo = 0, hi = 2.38; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (J(m) > ratio) lo = m; else hi = m; }
    const al = ratio >= .999 ? 0 : (lo + hi) / 2, N = 84, ds = L / N, sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const pts = [[0, 0]]; let x = 0, y = 0;
    for (let i = 0; i < N; i++) {
      const sv = (i + .5) * ds, th = sv < a ? 0 : sv < a + A ? -al * Math.sin(TAU * (sv - a) / A) : -st.neck * sm((sv - a - A) / b);
      x += Math.cos(th) * ds; y += Math.sin(th) * ds; pts.push([x, y]);
    }
    pts.forEach(p => { p[0] += st.lean * p[1]; });
    const ox = st.anchor === 'head' ? st.ax - pts[N][0] : st.ax - pts[0][0];
    pts.forEach(p => { p[0] += ox; p[1] += I.base; });
    const at = sv => { const q = clamp(sv / ds, 0, N - 1e-6), i = Math.floor(q), f = q - i, A0 = pts[i], B0 = pts[i + 1]; return [lerp(A0[0], B0[0], f), lerp(A0[1], B0[1], f), Math.atan2(B0[1] - A0[1], B0[0] - A0[0])]; };
    const out = [];
    for (let k = 0; k < this.n; k++) { const [px, py, ang] = at(L - (R * .9 + k * R)); out.push({ x: px, y: py, a: ang, r: R * (1 + .025 * Math.sin(this.t * 2.2 - k * .55)) * this.taper(k), k, ground: py > I.base - R * .45 }); }
    this.inchHead = [pts[N][0], pts[N][1]]; this.inchTilt = st.tilt;
    const T = I.cycles * I.cyc;
    if (I.t > T) {
      // settle into the pose from the invite art: a round hump behind the stem, then down and up into a raised head
      const k = ease.inOut(clamp((I.t - T) / 1.3, 0, 1)), P = this.restSegs();
      out.forEach((o, i) => { const q = P.segs[i]; o.x = lerp(o.x, q.x, k); o.y = lerp(o.y, q.y, k); o.a = lerp(o.a, q.a, k); o.ground = k > .5 ? q.ground : o.ground; });
      this.inchHead = [lerp(this.inchHead[0], P.head[0], k), lerp(this.inchHead[1], P.head[1], k)]; this.inchTilt = lerp(st.tilt, .04, k);
    }
    return out;
  }

  restSegs() {
    const g = this.glyph, h = g.h, R = this.R, cx = g.x + g.w * (CP.oneStem || .55), by = g.y + g.h, br = Math.sin(this.t * 1.3) * .006;
    // centre line in glyph-height units, tail → head (x right, y up)
    const C = [[-.42, .09], [-.36, .25], [-.24, .42 + br], [-.08, .5 + br], [.08, .48 + br], [.2, .36], [.28, .2], [.36, .12], [.44, .17], [.5, .28]].map(([x, y]) => [cx + x * h, by - y * h]);
    const pts = []; for (let i = 0; i < C.length - 1; i++) { const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)];
      for (let j = 0; j < 12; j++) { const t = j / 12, t2 = t * t, t3 = t2 * t; pts.push([0, 1].map(d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); } }
    pts.push(C[C.length - 1]);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const Lp = cum[cum.length - 1], at = sv => { sv = clamp(sv, 0, Lp); let i = 0; while (i < cum.length - 2 && cum[i + 1] < sv) i++; const f = (sv - cum[i]) / ((cum[i + 1] - cum[i]) || 1), A = pts[i], B = pts[i + 1]; return [lerp(A[0], B[0], f), lerp(A[1], B[1], f), Math.atan2(B[1] - A[1], B[0] - A[0])]; };
    // spread the segments evenly along the line so the body always fills it, head at the end
    const gap = (Lp - R * .9) / (this.n - 1), segs = [];
    for (let k = 0; k < this.n; k++) { const [x, y, a] = at(Lp - R * .9 - k * gap); segs.push({ x, y, a, ground: y > by - R * 1.25 && Math.abs(Math.cos(a)) > .6 }); }
    return { segs, head: [C[C.length - 1][0], C[C.length - 1][1] - R * .15] };
  }

  /* ---------- play ---------- */
  startPlay() {
    if (this.mode !== 'hero') this.buildHero(false);
    const segs = this.inchSegs();
    this.hatch = { t: 0, segs: segs.map(o => ({ ...o })), head: this.inchHead.slice(), x: this.W / 2, y: this.H * .5, popped: 0, sc: clamp(this.W / 390, .85, 1.3) };
    this.inch = null; this.hero = null; this.mode = 'hatch';
    this.dayI = -1; this.eaten = 0; this.elapsed = 0; this.timing = false; this.queue = 0; this.penalty = 0; this.bumps = 0; this.aches = 0; this.safeUntil = 0; this.target = null; this.fat = 0; this.fatOn = 0;
    this.foods = []; this.pending = []; this.spawnAt = 0; this.particles = []; this.ache = 0; this.input.down = false; this.keys = {};
  }
  // pop! the egg cracks and a tiny caterpillar climbs out heading up and to the right
  pop() {
    const h = this.hatch, x = h.x, y = h.y; h.popped = this.t;
    const pts = []; for (let i = 0; i <= 24; i++) pts.push([x - 2 + i * .1, y + 36 - i * 1.5]);
    this.setTrail(pts); this.headS = this.cum[this.cum.length - 1];
    this.dir = -PI / 2 + .45; this.n = 3; this.nShow = 3; this.R = 4.5; this.phase = 0;
    this.shrink = { t: 0, R0: 4.5 }; this.mode = 'play'; this.queue = 1.5;
    h.shell = { x, y: y - 3 * h.sc, vx: -70, vy: -250, a: 0, va: -5.5 };
    for (let i = 0; i < 12; i++) { const a = -PI / 2 + (this.rng() - .5) * 2.4, v = 60 + this.rng() * 120; this.particles.push({ x, y: y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.2 + this.rng() * 2, col: '#f4ead2', life: .6 + this.rng() * .4, age: 0, g: 420 }); }
    this.hooks.onHatch && this.hooks.onHatch();
  }
  drawHatch(g, front) {
    const h = this.hatch, E = CP.egg, t = h.t, age = h.popped ? this.t - h.popped : 0, sc = h.sc;
    const img = (o, x, y, ox, oy, rot = 0, s = 1, alpha = 1) => { g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot); g.scale(s * sc, s * sc); g.drawImage(o.img, ox, oy, o.w, o.h); g.restore(); };
    if (!front) {
      if (t < .55) this.drawCaterpillar(g, h.segs, 1 - ease.out(t / .55), h.head);
      const k = ease.out(clamp((t - .2) / .8, 0, 1)), fade = h.popped ? 1 - ease.inOut(clamp((age - 2.4) / .9, 0, 1)) : 1;
      if (k * fade > 0) img(E.leaf, h.x - 6 * sc, h.y + 22 * sc, -E.leaf.w / 2, -E.leaf.h / 2, (1 - k) * .08, .92 + .08 * k, k * fade);
      if (!h.popped) {
        const d = clamp((t - .75) / .55, 0, 1), drop = (1 - ease.back(d)) * -26 * sc;
        const shiver = [[1.45, 1.75, .1], [2.0, 2.3, .16], [2.45, 2.62, .22]].reduce((m, [s0, s1, A]) => m + (t > s0 && t < s1 ? Math.sin((t - s0) * 34) * A * Math.sin(PI * (t - s0) / (s1 - s0)) : 0), 0);
        const breath = 1 + Math.sin(t * 5) * .015 * clamp(t - 1.3, 0, 1);
        if (d > 0) img(E.whole, h.x, h.y + 14 * sc + drop, -17, -34, shiver, breath, clamp(d * 4, 0, 1));
      }
      return;
    }
    if (!h.popped) return;
    const fade = 1 - clamp((age - 1.1) / .5, 0, 1);
    if (fade > 0) img(E.bot, h.x, h.y + 14 * sc, -17, -34, Math.sin(age * 18) * .1 * Math.exp(-age * 4), 1, fade);
    const s = h.shell; if (age < 1.6) img(E.top, s.x, s.y, -17, -20, s.a, 1, 1 - clamp((age - 1) / .6, 0, 1));
  }
  nextDay() {
    this.dayI++;
    this.foods = this.foods.filter(o => !o.decoy || o.eaten >= 0);
    const d = DAYS[this.dayI]; if (!d) return;
    this.pending = this.groups(d); this.spawn(this.pending.shift());
    if (this.dayI === 0) { this.timing = true; this.elapsed = 0; }
    this.hooks.onDay && this.hooks.onDay(this.dayI, d);
  }
  // weekdays come in random side-by-side bundles (one sweep eats them all); Saturday comes in rows of three
  groups(d) {
    const f = d.foods.slice(), out = [];
    if (d.rows) { while (f.length) out.push(f.splice(0, d.rows)); return out; }
    if (!d.bundle) return f.map(k => [k]);
    while (f.length) { const r = this.rng(), n = Math.min(f.length, r < .2 ? 1 : r < .75 ? 2 : 3); out.push(f.splice(0, n)); }
    if (out.every(g => g.length === 1) && out.length > 1) out.splice(0, 2, out[0].concat(out[1]));
    return out;
  }
  spawn(keys) {
    const r = this.rng, head = this.at(this.headS), top = this.top + 44, bot = this.H - 150, n = keys.length;
    const scs = keys.map(k => this.fs * (k === 'leaf' ? 2.4 : 1)), ws = keys.map((k, i) => FOOD[k].w * scs[i]), hs = keys.map((k, i) => FOOD[k].h * scs[i]);
    // lay the bundle out along a line, each piece just kissing the next
    const ang = n === 1 ? 0 : this.dayI === 5 ? (r() - .5) * .12 : [0, 0, PI / 2, .5, -.5][Math.floor(r() * 5)];
    const ca = Math.cos(ang), sa = Math.sin(ang), step = (i, j) => (Math.abs(ca) * (ws[i] + ws[j]) / 2 + Math.abs(sa) * (hs[i] + hs[j]) / 2) * (this.dayI === 5 ? .74 : .84);
    const offs = [0]; for (let i = 1; i < n; i++) offs.push(offs[i - 1] + step(i - 1, i)); const mid = offs[n - 1] / 2;
    const pts = offs.map(o => [(o - mid) * ca, (o - mid) * sa]);
    const ex = Math.max(...pts.map((p, i) => Math.abs(p[0]) + ws[i] / 2)) + 8, ey = Math.max(...pts.map((p, i) => Math.abs(p[1]) + hs[i] / 2)) + 8;
    const x0 = Math.min(ex, this.W / 2), x1 = Math.max(this.W - ex, this.W / 2), y0 = Math.min(top + ey * .5, (top + bot) / 2), y1 = Math.max(bot - ey * .3, (top + bot) / 2);
    const away = this.foods.filter(f => f.eaten < 0);
    let best = null, bestD = -Infinity;
    for (let k = 0; k < 160; k++) {
      const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
      const dh = Math.min(...pts.map(p => Math.hypot(x + p[0] - head[0], y + p[1] - head[1])));
      let dmin = 160; away.forEach(f => pts.forEach(p => { dmin = Math.min(dmin, Math.hypot(x + p[0] - f.x, y + p[1] - f.y)); }));
      const score = dmin + (dh > 110 ? 40 : -200) - Math.abs(x - this.W / 2) * .08;
      if (score > bestD) { bestD = score; best = [x, y]; }
      if (dmin >= 160 && dh > 130) break;
    }
    keys.forEach((key, i) => {
      const f = FOOD[key], sc = scs[i];
      const food = { key, x: best[0] + pts[i][0], y: best[1] + pts[i][1], w: f.w * sc, h: f.h * sc, born: this.t + i * .09, rot: (r() - .5) * (n > 1 ? .18 : .3), ph: r() * TAU, eaten: -1, bites: key === 'leaf' ? 4 : 1, biteAt: 0, holes: [], sc };
      this.foods.push(food);
    });
    // Tue–Fri: a wrong fruit tucked beside the bundle; eating it gives a tummy ache
    if (this.dayI >= 1 && this.dayI <= 4) {
      const pool = ['apple', 'pear', 'plum', 'strawberry', 'orange'].filter(k => k !== DAYS[this.dayI].foods[0]);
      const nd = this.dayI >= 3 && r() < .5 ? 2 : 1, side = r() < .5 ? 1 : -1;
      for (let j = 0; j < nd; j++) {
        const key = pool[Math.floor(r() * pool.length)], F = FOOD[key], sg = j ? -side : side;
        const along = (r() - .5) * offs[n - 1], d = (82 + r() * 14) * this.fs, mx = F.w * this.fs / 2 + 6;
        const x = clamp(best[0] + along * ca - sa * d * sg, mx, this.W - mx), y = clamp(best[1] + along * sa + ca * d * sg, top, bot);
        this.foods.push({ key, decoy: true, x, y, w: F.w * this.fs, h: F.h * this.fs, born: this.t + n * .09 + .15 + j * .1, rot: (r() - .5) * .3, ph: r() * TAU, eaten: -1, bites: 1, biteAt: 0, holes: [], sc: this.fs });
      }
    }
  }
  // the big leaf goes in bites; each one leaves a scalloped hole
  bite(f, h) {
    if (this.t - f.biteAt < .5) return;
    f.biteAt = this.t; f.bites--; this.chomp = 1;
    const F = FOOD[f.key], c = Math.cos(-f.rot), s = Math.sin(-f.rot), dx = h[0] - f.x, dy = h[1] - f.y;
    let lx = (dx * c - dy * s) / f.sc, ly = (dx * s + dy * c) / f.sc; const L = Math.hypot(lx, ly) || 1, rr = Math.min(F.w, F.h) * .3;
    lx = lx / L * Math.min(L, F.w * .32); ly = ly / L * Math.min(L, F.h * .3);
    f.holes.push([lx, ly, rr]);
    const cv = f.cv || (f.cv = document.createElement('canvas')), k = 3; cv.width = F.w * k; cv.height = F.h * k;
    const g = cv.getContext('2d'); g.drawImage(F.img, 0, 0, cv.width, cv.height); g.globalCompositeOperation = 'destination-out'; g.scale(k, k); g.translate(F.w / 2, F.h / 2);
    f.holes.forEach(([x, y, r], i) => { for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + i; g.beginPath(); g.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .6, 0, TAU); g.fill(); } });
    for (let i = 0; i < 7; i++) { const a = this.rng() * TAU, v = 40 + this.rng() * 70; this.particles.push({ x: h[0], y: h[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, r: 1.5 + this.rng() * 2.5, col: FOOD[f.key].col, life: .5, age: 0, g: 240 }); }
    this.hooks.onBite && this.hooks.onBite(f.bites);
  }
  eat(f) {
    f.eaten = this.t; this.chomp = 1;
    const col = FOOD[f.key].col;
    if (f.decoy) {
      this.aches++; this.penalty += 5; this.ache = this.t; this.wig = 1;
      for (let i = 0; i < 9; i++) { const a = this.rng() * TAU, v = 50 + this.rng() * 90; this.particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: 2 + this.rng() * 3, col, life: .55 + this.rng() * .3, age: 0, g: 260 }); }
      this.particles.push({ x: f.x, y: f.y - this.R * 2, vx: 0, vy: -40, r: 0, txt: '+5s', life: 1.3, age: 0, g: 0, drag: .4 });
      this.hooks.onDecoy && this.hooks.onDecoy(f.key, this.aches);
      return;
    }
    this.eaten++; this.n++;
    for (let i = 0; i < 9; i++) { const a = this.rng() * TAU, v = 50 + this.rng() * 90; this.particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: 2 + this.rng() * 3, col, life: .55 + this.rng() * .3, age: 0, g: 260 }); }
    const onBoard = this.foods.filter(o => o.eaten < 0 && !o.decoy).length;
    if (!onBoard) this.foods.forEach(o => { if (o.decoy && o.eaten < 0 && !o.gone) o.gone = this.t; });
    if (!onBoard && this.pending && this.pending.length) this.spawnAt = this.t + .28;
    const left = onBoard + (this.pending ? this.pending.reduce((a, g) => a + g.length, 0) : 0);
    this.hooks.onEat && this.hooks.onEat(f.key, left, this.dayI);
    if (left === 0) {
      if (this.dayI === 5) { this.queue = 2.2; this.ache = this.t; this.fatOn = this.t + 1.9; this.hooks.onAche && this.hooks.onAche(); }
      else if (this.dayI === 6) { this.foods = this.foods.filter(o => !o.decoy); this.timing = false; this.hooks.onFinish && this.hooks.onFinish(this.score(), this.bumps, this.aches); this.queue = -1; setTimeout(() => this.startTransform(), 1700); }
      else this.queue = .75;
    }
  }
  steer(dt) {
    const head = this.at(this.headS); let want = null;
    if (this.target) { want = [this.target.x, this.target.y]; if (!this.input.down && Math.hypot(want[0] - head[0], want[1] - head[1]) < this.R * 1.2) { this.target = null; want = null; } }
    else if (Object.keys(this.keys).length) { const k = this.keys; const kx = (k.R ? 1 : 0) - (k.L ? 1 : 0), ky = (k.D ? 1 : 0) - (k.U ? 1 : 0); if (kx || ky) { this.target = null; want = [head[0] + kx * 200, head[1] + ky * 200]; } }
    else if (this.auto) { let best = null, bd = 1e9; this.foods.forEach(f => { if (f.eaten >= 0 || f.decoy) return; const d = Math.hypot(f.x - head[0], f.y - head[1]); if (d < bd) { bd = d; best = f; } }); if (best) want = [best.x, best.y]; }
    let turn = 7.5;
    // a gentle pull toward food that is nearly in his path
    if (!this.auto) this.foods.forEach(f => { if (f.eaten >= 0 || f.decoy || this.t < f.born) return; const dx = f.x - head[0], dy = f.y - head[1], d = Math.hypot(dx, dy), da = angDiff(this.dir, Math.atan2(dy, dx)); if (d < 95 * this.fs && Math.abs(da) < .9) this.dir += clamp(da, -2.4 * dt, 2.4 * dt); });
    // with no tap to follow he turns away from the edges; steering into a wall still bumps
    if (false) { const look = this.R * 4 + 80 * this.fs, lx = head[0] + Math.cos(this.dir) * look, ly = head[1] + Math.sin(this.dir) * look;
      if (lx < 0 || lx > this.W || ly < this.top - 34 || ly > this.H - 34) { const c = Math.atan2(this.H * .5 - head[1], this.W / 2 - head[0]); this.dir += clamp(angDiff(this.dir, c), -5 * dt, 5 * dt); } }
    if (want) { const dx = want[0] - head[0], dy = want[1] - head[1]; if (Math.hypot(dx, dy) > this.R * .8) this.dir += clamp(angDiff(this.dir, Math.atan2(dy, dx)), -turn * dt, turn * dt); }
  }

  /* ---------- metamorphosis ---------- */
  startTransform() {
    const segs = this.segPositions();
    const pts = segs.concat([{ x: this.at(this.headS)[0], y: this.at(this.headS)[1] }]), mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    this.tf = { t: 0, segs: segs.map(s => ({ ...s })), head: this.at(this.headS), cx: this.W / 2, cy: this.H * .5 };
    this.mode = 'transform'; this.foods = [];
    this.hooks.onTransform && this.hooks.onTransform();
  }
  restPose() { const g = this.glyph; return { x: g.x + g.w * .5, y: g.y + g.h * .02, w: Math.min(this.W * .64, 270), tilt: -.08 }; }
  setRest() { this.layout(); this.mode = 'rest'; this.bf = Object.assign({ p: 0, burst: 1.5, alpha: 1 }, this.restPose()); this.foods = []; }

  /* ---------- per frame ---------- */
  step(dt) {
    this.t += dt; const t = this.t;
    if (this.nextBlink < t) { this.blinkT = t; this.nextBlink = t + 2.6 + this.rng() * 2.6; }
    this.blink = this.blinkT ? clamp(1 - Math.abs((t - this.blinkT) / .08 - 1), 0, 1) : 0;
    this.chomp = Math.max(0, this.chomp - dt * 3.2);
    this.particles = this.particles.filter(p => { p.age += dt; p.vy += p.g * dt; p.vx *= Math.pow(p.drag || .5, dt); p.vy *= Math.pow(p.drag || .5, dt); p.x += p.vx * dt; p.y += p.vy * dt; if (p.spin) p.a += p.spin * dt; return p.age < p.life; });
    if (this.hatch) {
      const h = this.hatch; h.t += dt;
      if (h.shell && h.popped) { const sh = h.shell; sh.vy += 700 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.a += sh.va * dt; }
      if (this.mode === 'hatch') { if (!h.said && h.t > .6) { h.said = 1; this.hooks.onHatchStart && this.hooks.onHatchStart(); } if (h.t > 2.7) this.pop(); }
      else if (this.mode !== 'play' || t - h.popped > 4) this.hatch = null;
    }
    if (this.mode === 'hero') {
      this.inch.t += dt; this.speed = 0;
    } else if (this.mode === 'play') {
      const sh = this.shrink; if (sh && sh.t < 1) { sh.t = Math.min(1, sh.t + dt / 1.3); this.R = lerp(sh.R0, 13, ease.inOut(sh.t)); }
      else { const target = lerp(13 + 5 * this.eaten / CP.TOTAL_FOODS, 20, ease.inOut(this.fat)); this.R = lerp(this.R, target, 1 - Math.exp(-dt * 4)); }
      if (this.queue > 0) { this.queue -= dt; if (this.queue <= 0) this.nextDay(); }
      if (this.spawnAt && t > this.spawnAt) { this.spawnAt = 0; this.spawn(this.pending.shift()); this.hooks.onSpawn && this.hooks.onSpawn(); }
      if (this.timing) this.elapsed += dt;
      if (this.fatOn && t > this.fatOn) this.fat = Math.min(1, this.fat + dt / 1.4);
      const aching = this.ache && t - this.ache < 2;
      this.speed = 180 * this.fs * (1 - .22 * this.fat) * (aching ? .35 : 1) * (sh && sh.t < 1 ? .2 + .8 * ease.inOut(sh.t) : 1);
      this.steer(dt);
      if (aching) this.dir += Math.sin(t * 9) * dt * 2;
      const h = this.at(this.headS); this.push(h[0] + Math.cos(this.dir) * this.speed * dt, h[1] + Math.sin(this.dir) * this.speed * dt); this.headS = this.cum[this.cum.length - 1];
      this.phase += this.speed * dt / (this.R * 2.4) * TAU;
      const hh = this.at(this.headS);
      this.checkWall(hh);
      if (this.timing && t > this.safeUntil) this.checkBump(hh);
      this.near = 0;
      this.foods.forEach(f => { if (f.eaten >= 0 || f.gone || t < f.born) return; const d = Math.hypot(f.x - hh[0], f.y - hh[1]); if (d < 70 && !f.decoy) this.near = 1; if (d < this.R * 1.5 + (f.bites > 1 ? f.w * .3 : 26 * this.fs)) { if (f.bites > 1) this.bite(f, hh); else this.eat(f); } });
      this.foods = this.foods.filter(f => (f.eaten < 0 || t - f.eaten < .9) && !(f.gone && t - f.gone > .5));
    } else if (this.mode === 'transform') this.stepTransform(dt);
    else if (this.mode === 'rest') this.stepButterfly(dt);
    else if (this.mode === 'leave') { this.lv.t += dt; if (this.lv.t > 4.2) this.buildHero(true); }
    if (this._m !== this.mode) { this._m = this.mode; this.card.classList.toggle('behind', this.mode === 'hero'); }
    this.nShow = lerp(this.nShow, this.fat ? lerp(this.n, 11, ease.inOut(this.fat)) : this.n, 1 - Math.exp(-dt * 6));
    this.wig = Math.max(0, this.wig - dt * .7);
    // head facing with hysteresis
    if (this.mode === 'hero' || this.mode === 'play') {
      const a = this.at(this.headS), b = this.at(this.headS - this.R * .6), dx = a[0] - b[0];
      const L = Math.hypot(dx, a[1] - b[1]) || 1; this.hdir = Math.atan2(a[1] - b[1], dx);
      if (dx / L > .22) this.faceT = 1; else if (dx / L < -.22) this.faceT = -1;
      this.face += clamp(this.faceT - this.face, -dt * 9, dt * 9);
    }
  }
  stepButterfly(dt) {
    const b = this.bf; b.burst -= dt;
    if (b.burst < 0 && !b.flapping) { b.flapping = 2 + ((this.rng() * 3) | 0); }
    if (b.flapping) { const prev = b.p; b.p += dt * TAU * 1.6; if (Math.floor(b.p / TAU) > Math.floor(prev / TAU)) { b.flapping--; if (!b.flapping) { b.p = Math.ceil(b.p / TAU) * TAU; b.burst = 2.2 + this.rng() * 2.5; } } }
  }
  stepTransform(dt) {
    const f = this.tf; f.t += dt; const t = f.t;
    if (!f.burst && t > 3.9) { f.burst = 1; this.confetti(f.cx, f.cy + 10, 70); this.hooks.onEmerge && this.hooks.onEmerge(); }
    if (t > 4.8 && !f.path) {
      this.layout(); const r = this.restPose(); f.rest = r; this.hooks.onFly && this.hooks.onFly();
      f.path = [[f.cx, f.cy], [f.cx, f.cy], [this.W * .8, this.H * .32], [this.W * .2, this.H * .22], [this.W * .62, this.H * .06], [this.W * 1.35, -this.H * .2], [this.W * 1.35, -this.H * .2]];
    }
    if (t > 8.3 && !f.done) { f.done = 1; this.buildHero(true); this.hooks.onTransformDone && this.hooks.onTransformDone(); }
  }
  confetti(x, y, n) {
    const tex = ['apple', 'orange', 'bfyellow', 'blue', 'bfpurple', 'bflime', 'pink', 'teal', 'strawberry'];
    for (let i = 0; i < n; i++) { const a = -PI / 2 + (this.rng() - .5) * PI * 1.6, v = 160 + this.rng() * 340; this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + this.rng() * 4.5, tex: tex[i % tex.length], life: 2.2 + this.rng() * 1.6, age: 0, g: 330, drag: .18, a: this.rng() * TAU, spin: (this.rng() - .5) * 14 }); }
  }

  /* ---------- body geometry ---------- */
  segPositions() {
    if (this.mode === 'hero' && this.inch) return this.inchSegs();
    const R = this.R, gap = R * .9, base = R * .97, out = [], amp = clamp(Math.abs(this.speed) / 60, 0, 1) * (this.mode === 'hero' ? .2 : .2), wig = this.wig, play = this.mode === 'play';
    const N = Math.ceil(this.nShow);
    let d = gap;
    for (let k = 0; k < N; k++) {
      const w = play ? Math.sin(this.phase * .8 + k * .6) : Math.sin(this.phase - k * .8), w2 = Math.sin(this.t * 2.2 - k * .55);
      if (k) d += base * (1 + .05 * this.fat) * (1 + amp * w + wig * .18 * Math.sin(this.t * 14 - k));
      const s = this.headS - d, p = this.at(s), q = this.at(s + R * .5);
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const lift = R * ((play ? amp * .32 * Math.pow(Math.max(0, -w), 2) : amp * .9 * Math.max(0, w)) + .03 * w2 + wig * .12 * Math.max(0, Math.sin(this.t * 14 - k)));
      const frac = k === N - 1 ? clamp(this.nShow - k, .15, 1) : 1;
      const r = R * (1 + .03 * w2 + amp * .25 * w) * frac * this.taper(k, N);
      const wp = play ? this.wrapPt(p[0], p[1]) : p;
      out.push({ x: wp[0], y: wp[1] - lift, a, r, k, w });
    }
    return out;
  }

  /* ---------- drawing ---------- */
  draw() {
    const g = this.g; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, this.W, this.H);
    this.ripples = this.ripples.filter(rp => this.t - rp.t < .6);
    this.ripples.forEach(rp => { const k = (this.t - rp.t) / .6, e = ease.out(k), r = 8 + 30 * e;
      g.save(); g.globalAlpha = .22 * (1 - k); g.fillStyle = '#2e8b3a'; g.beginPath(); g.arc(rp.x, rp.y, r, 0, TAU); g.fill();
      g.globalAlpha = .35 * (1 - k); g.strokeStyle = '#2e8b3a'; g.lineWidth = 1.5; g.stroke(); g.restore(); });
    if (this.mode === 'play' || this.mode === 'transform') this.drawFoods(g);
    this.drawParticles(g, false);
    if (this.hatch) this.drawHatch(g, false);
    if (this.mode === 'hero' || this.mode === 'play') this.drawCaterpillar(g, this.segPositions());
    if (this.hatch) this.drawHatch(g, true);
    if (this.mode === 'transform') this.drawTransform(g);
    if (this.mode === 'leave') { const b = this.bf, v = clamp(this.lv.t / 4.2, 0, 1), e = ease.inOut(v), [x, y] = this.crPoint(this.lv.path, e), tilt = clamp((x - (this.lv.px ?? x)) * .03, -.4, .4); this.lv.px = x;
      CP.drawButterfly(g, x, y, b.w * (1 - .4 * e), this.flapX(this.lv.t * TAU * 3.4), tilt); }
    if (this.mode === 'rest') { const b = this.bf; const p = b.p; CP.drawButterfly(g, b.x, b.y + Math.sin(this.t * 1.6) * 2, b.w, this.flapX(p), b.tilt + Math.sin(this.t * .9) * .02, b.alpha); }
    this.drawParticles(g, true);
  }
  crPoint(P, e) {
    const seg = P.length - 3, q = Math.min(seg - 1e-6, e * seg), i = Math.floor(q), l = q - i;
    const cr = (a, b, c, d) => .5 * (2 * b + (-a + c) * l + (2 * a - 5 * b + 4 * c - d) * l * l + (-a + 3 * b - 3 * c + d) * l * l * l);
    return [cr(P[i][0], P[i + 1][0], P[i + 2][0], P[i + 3][0]), cr(P[i][1], P[i + 1][1], P[i + 2][1], P[i + 3][1])];
  }
  taper(k, N = this.n) { return [.8, .88, .95][k - (N - 3)] || 1; }
  score() { return this.elapsed + this.penalty; }
  // bumping into his own body costs time instead of ending the game
  checkBump(h) {
    const segs = this.segPositions();
    for (let i = 4; i < segs.length; i++) {
      const sg = segs[i]; if (Math.hypot(sg.x - h[0], sg.y - h[1]) > this.R * 1.15) continue;
      this.bumps++; this.penalty += 3; this.safeUntil = this.t + 1.2; this.wig = 1;
      this.dir = Math.atan2(h[1] - sg.y, h[0] - sg.x);
      this.particles.push({ x: h[0], y: h[1] - this.R * 2, vx: 0, vy: -40, r: 0, txt: '+3s', life: 1.1, age: 0, g: 0, drag: .4 });
      this.hooks.onBump && this.hooks.onBump(this.bumps, 'self');
      return;
    }
  }
  // the field wraps: out one side, back in the other (the whole trail shifts, segments wrap one by one when drawn)
  field() { const p = this.R * 1.6; return { x0: -p, y0: this.top - 30 - p, w: this.W + p * 2, h: this.H - 40 - this.top + 30 + p * 2 }; }
  wrapPt(x, y) { const f = this.field(); return [f.x0 + (((x - f.x0) % f.w) + f.w) % f.w, f.y0 + (((y - f.y0) % f.h) + f.h) % f.h]; }
  checkWall(h) {
    const f = this.field(); let dx = 0, dy = 0;
    if (h[0] < f.x0) dx = f.w; else if (h[0] > f.x0 + f.w) dx = -f.w;
    if (h[1] < f.y0) dy = f.h; else if (h[1] > f.y0 + f.h) dy = -f.h;
    if (!dx && !dy) return;
    this.trail.forEach(p => { p[0] += dx; p[1] += dy; }); this.target = null;
  }
  flyAway() {
    if (this.mode !== 'rest') return;
    const b = this.bf, W = this.W, H = this.H;
    this.lv = { t: 0, path: [[b.x, b.y], [b.x, b.y], [b.x + 40, b.y - 60], [W * .86, H * .26], [W * .52, H * .4], [W * .14, H * .22], [W * .5, H * .02], [W * 1.3, -H * .18], [W * 1.3, -H * .18]] };
    this.mode = 'leave';
  }
  flapX(p) { return .08 + .92 * Math.pow((1 + Math.cos(p)) / 2, .6); }
  drawFoods(g) {
    const t = this.t;
    this.foods.forEach(f => {
      if (t < f.born) return;
      const F = FOOD[f.key], age = t - f.born, s = ease.back(clamp(age / .45, 0, 1));
      let sc = s, alpha = 1, img = F.img;
      if (f.cv) img = f.cv;
      if (f.eaten >= 0) { const e = t - f.eaten; img = f.cv || F.eaten; sc = 1 + .12 * Math.sin(clamp(e / .18, 0, 1) * PI); alpha = 1 - clamp((e - .35) / .5, 0, 1); sc *= 1 - .25 * clamp((e - .35) / .5, 0, 1); }
      if (f.gone) { const e = clamp((t - f.gone) / .5, 0, 1); alpha *= 1 - e; sc *= 1 - .4 * e; }
      const bob = Math.sin(t * 2 + f.ph) * 1.6, rot = f.rot + Math.sin(t * 1.3 + f.ph) * .04;
      g.save(); g.globalAlpha = alpha; g.translate(f.x, f.y + bob); g.rotate(rot); g.scale(sc, sc);
      g.drawImage(img, -f.w / 2, -f.h / 2, f.w, f.h); g.restore();
    });
  }
  drawParticles(g, front) {
    this.particles.forEach(p => {
      if (!!(p.tex || p.txt) !== front) return;
      const k = 1 - clamp((p.age - p.life * .7) / (p.life * .3), 0, 1);
      g.save(); g.globalAlpha = k; g.translate(p.x, p.y);
      if (p.txt) { g.font = '700 22px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.strokeText(p.txt, 0, 0); g.fillStyle = p.good ? '#2f8a2a' : '#d42a1c'; g.fillText(p.txt, 0, 0); }
      else if (p.tex) { g.rotate(p.a); g.scale(1, Math.max(.15, Math.abs(Math.cos(p.a * 1.3)))); g.fillStyle = CP.pat(g, p.tex, .25); g.beginPath(); g.arc(0, 0, p.r, 0, TAU); g.fill(); }
      else { g.fillStyle = p.col; g.beginPath(); g.arc(0, 0, p.r * (1 - p.age / p.life * .5), 0, TAU); g.fill(); }
      g.restore();
    });
  }
  drawCaterpillar(g, segs, alpha = 1, headPos) {
    const fat = this.fat || 0, R = this.R * (1 + .22 * fat), list = SEG.list, S = (SEG.R + SEG.pad) * 2;
    g.save(); g.globalAlpha = alpha;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], sc = s.r / SEG.R;
      // feet behind the body on the downward side
      const nx = -Math.sin(s.a), ny = Math.cos(s.a), sg = ny >= 0 ? 1 : -1, fy = ny * sg;
      const onGround = s.ground !== undefined ? s.ground : fy > .3 && i % 2 === 0;
      if (onGround) for (const off of [-.28, .28]) {
        const step = Math.sin(this.phase - i * .8 + 1.2 + off * 4), fx = nx * sg, len = s.r * (.9 + .48 * fat - .05 * Math.max(0, step));
        g.save(); g.translate(s.x + fx * len + Math.cos(s.a) * s.r * (off + step * .06), s.y + fy * len + Math.sin(s.a) * s.r * (off + step * .06));
        g.rotate(Math.atan2(fy, fx) - PI / 2); g.scale(sc * .36, sc * .42); g.drawImage(SEG.foot, -7, -5, 14, 16); g.restore();
      }
      g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.scale(1, sg); if (fat) g.scale(1 + .12 * fat, 1 + .5 * fat);
      g.drawImage(list[(i * 7 + 3) % list.length], -S / 2 * sc, -S / 2 * sc, S * sc, S * sc); g.restore();
    }
    const hero = this.mode === 'hero' && !headPos, h = headPos || (hero ? this.inchHead : this.at(this.headS)), d = this.hdir || 0;
    const tilt = hero ? this.inchTilt : clamp(Math.atan2(Math.sin(d), Math.abs(Math.cos(d))) * .55, -.7, .7) * (this.faceT || 1);
    const munch = this.mode === 'play' && this.near ? Math.max(0, Math.sin(this.t * 20)) * .035 : 0;
    const face = Math.abs(this.face) < .12 ? .12 * Math.sign(this.face || 1) : this.face;
    CP.drawHead(g, h[0], h[1] - (this.wig ? Math.sin(this.t * 14) * R * .06 * this.wig : 0), R, face, tilt + (hero ? Math.sin(this.t * 1.1) * .04 : 0), this.chomp * .14 * Math.sin((1 - this.chomp) * PI * 3) + munch, this.blink);
    g.restore();
  }
  drawTransform(g) {
    const f = this.tf, t = f.t, co = CP.cocoon;
    // 1. he glides, tail first, into a hanging pose under the twig (whole body, no break-up)
    const sz = Math.min(this.W * .32, 130) / co.h * 1.6, top = f.cy - 30, N = f.segs.length, rt = 19 * sz, y0 = top + 4 * sz, yH = top + 78 * sz;
    if (f.R0 === undefined) f.R0 = this.R;
    const edge = t < 1.3 ? lerp(-26, 2, ease.out(clamp((t - .7) / .55, 0, 1))) : lerp(2, 112, ease.inOut(clamp((t - 1.35) / 1.3, 0, 1)));
    let rot = 0; if (t > 2.6 && t < 3.8) { const w = (t - 2.6) / 1.2; rot = Math.sin(w * PI * 6) * .07 * Math.sin(w * PI); }
    if (t < 2.7) {
      const segs = f.segs.map((s0, k) => {
        const e = ease.inOut(clamp((t - .05 - (1 - k / N) * .45) / 1.05, 0, 1)), ty = yH - (k + 1) / N * (yH - y0 - rt * .3), tx = f.cx + Math.sin(k * .7) * 1.2 * sz;
        return { ...s0, x: lerp(s0.x, tx, e), y: lerp(s0.y, ty, e) - Math.sin(PI * e) * 18, a: s0.a + angDiff(s0.a, PI / 2) * e, r: lerp(s0.r, rt * (k > N - 4 ? .9 : 1), e) };
      });
      const eh = ease.inOut(clamp((t - .5) / 1.05, 0, 1));
      this.R = lerp(f.R0, rt * .95, eh);
      // only the part the silk hasn't reached yet stays visible, so nothing pokes out of the cocoon
      g.save();
      if (t > .7) { const m = new DOMMatrix().translate(f.cx, top - 18 * sz).rotate(rot * 180 / PI).translate(0, 18 * sz).scale(sz); const below = new Path2D(); below.moveTo(-400, -400); below.lineTo(400, -400); below.lineTo(400, 2000); below.lineTo(-400, 2000); below.closePath();
        const wrap = new Path2D(); wrap.moveTo(-40, -30); wrap.lineTo(40, -30); for (let x = 40; x >= -40; x -= 4) wrap.lineTo(x, edge + Math.sin(x * .22 + t * 7) * 2.6); wrap.closePath();
        const hide = new Path2D(); hide.addPath(wrap, m); const keep = new Path2D(); keep.addPath(below, new DOMMatrix()); keep.addPath(hide); g.clip(keep, 'evenodd'); }
      this.drawCaterpillar(g, segs, 1 - clamp((t - 2.45) / .25, 0, 1), [lerp(f.head[0], f.cx, eh), lerp(f.head[1], yH + rt * .2, eh) - Math.sin(PI * eh) * 18]);
      g.restore();
    }
    // 2. he spins his little house around himself: the cocoon wraps him from the twig down, sways, then splits
    if (t > .7 && t < 4.35) {
      const out = clamp((t - 3.85) / .5, 0, 1), sc = sz * (1 + out * .12);
      g.save(); g.globalAlpha = 1 - out; g.translate(f.cx, top - 18 * sz); g.rotate(rot); g.translate(0, 18 * sz); g.scale(sc, sc);
      const clip = new Path2D(); clip.moveTo(-40, -30); clip.lineTo(40, -30);
      for (let x = 40; x >= -40; x -= 4) clip.lineTo(x, edge + Math.sin(x * .22 + t * 7) * 2.6);
      clip.closePath(); g.clip(clip);
      g.drawImage(co.img, -co.w / 2, -22, co.w, co.h); g.restore();
    }
    // 3. butterfly unfolds and flies to the "1"
    if (t > 3.85) {
      const u = clamp((t - 3.85) / 1.05, 0, 1), restW = Math.min(this.W * .64, 270);
      let x = f.cx, y = f.cy + 6, w = restW * (.55 + .45 * ease.out(u)), flap = u < 1 ? this.flapX(PI * (1 - ease.out(u))) : 1, tilt = 0;
      if (f.path && t > 4.8) {
        const v = clamp((t - 4.8) / 3.5, 0, 1), e = ease.inOut(v), P = f.path, seg = P.length - 3, q = Math.min(seg - 1e-6, e * seg), i = Math.floor(q), l = q - i;
        const cr = (a, b, c, d) => .5 * (2 * b + (-a + c) * l + (2 * a - 5 * b + 4 * c - d) * l * l + (-a + 3 * b - 3 * c + d) * l * l * l);
        const nx = cr(P[i][0], P[i + 1][0], P[i + 2][0], P[i + 3][0]), ny = cr(P[i][1], P[i + 1][1], P[i + 2][1], P[i + 3][1]);
        tilt = clamp((nx - (f.px ?? nx)) * .02, -.35, .35); f.px = nx;
        x = nx; y = ny + Math.sin(v * PI * 6) * 8; w = restW * (1 - .35 * e);
        flap = this.flapX((t - 4.8) * TAU * 3.1);
      }
      CP.drawButterfly(g, x, y, w, flap, tilt);
    }
  }
}
CP.Game = Game;
})();
