/* Game: caterpillar body, hero pose, play loop, metamorphosis, butterfly */
(() => {
'use strict';
const { clamp, lerp, ease, angDiff, rng, TAU, IMG, SEG, FOOD, DPR } = CP;
const PI = Math.PI;

const DAYS = CP.DAYS = [
  { day: 'Monday', what: 'he ate through one apple.', foods: ['apple'], tex: 'apple' },
  { day: 'Tuesday', what: 'he ate through two pears.', foods: ['pear', 'pear'], tex: 'pear' },
  { day: 'Wednesday', what: 'he ate through three plums.', foods: ['plum', 'plum', 'plum'], tex: 'plum' },
  { day: 'Thursday', what: 'he ate through four strawberries.', foods: Array(4).fill('strawberry'), tex: 'strawberry' },
  { day: 'Friday', what: 'he ate through five oranges.', foods: Array(5).fill('orange'), tex: 'orange' },
  { day: 'Saturday', what: 'he ate through one piece of chocolate cake, one ice-cream cone, one pickle, one slice of Swiss cheese, one slice of salami, one lollipop, one piece of cherry pie, one sausage, one cupcake, and one slice of watermelon.', short: 'cake, ice cream, pickle, cheese, salami, lollipop, cherry pie, sausage, cupcake & watermelon', foods: ['cake', 'icecream', 'pickle', 'cheese', 'salami', 'lollipop', 'pie', 'sausage', 'cupcake', 'watermelon'], tex: 'pink' },
  { day: 'Sunday', what: 'he ate through one nice green leaf, and after that he felt much better.', foods: ['leaf'], tex: 'leaf' },
];
CP.TOTAL_FOODS = DAYS.reduce((a, d) => a + d.foods.length, 0);

class Game {
  constructor(cv, card, hooks = {}) {
    this.cv = cv; this.g = cv.getContext('2d'); this.card = card; this.hooks = hooks;
    this.t = 0; this.mode = 'idle'; this.particles = []; this.foods = [];
    this.trail = []; this.cum = []; this.phase = 0; this.wig = 0; this.nextWig = 5;
    this.face = 1; this.faceT = 1; this.blink = 0; this.nextBlink = 2.5; this.chomp = 0;
    this.R = 20; this.n = 9; this.nShow = 9; this.speed = 0;
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
  bindInput() {
    const pos = e => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.cv.addEventListener('pointerdown', e => { if (this.mode !== 'play') return; e.preventDefault(); this.cv.setPointerCapture(e.pointerId); [this.input.x, this.input.y] = pos(e); this.input.down = true; this.hooks.onTouch && this.hooks.onTouch(); });
    this.cv.addEventListener('pointermove', e => { if (!this.input.down) return; [this.input.x, this.input.y] = pos(e); });
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
    const g = this.glyph, R = clamp(g.h * .1, 12, 22); this.R = R;
    const n = 14, L = R * .9 + (n - 1) * R, base = g.y + g.h - R * .78, A = L - R * 3.05, restRatio = .34;
    // resting pose from the invite art: arch centred on the stem of the "1", tail and head on the ground either side
    const stemX = g.x + g.w * (CP.oneStem || .55), headX = stemX + restRatio * A / 2 + R * 2.55;
    this.n = this.nShow = n;
    const pts = []; for (let x = -2000; x <= headX; x += 4) pts.push([x, base]);
    this.setTrail(pts); this.headS = this.cum[this.cum.length - 1];
    const tail0 = entrance ? -L - 40 : headX - L, dist = headX - L - tail0, cycles = entrance ? Math.max(3, Math.round(dist / (L * .5))) : 0;
    const D = cycles ? dist / cycles : 0, S = D || L * .5;
    this.inch = { t: entrance ? 0 : 99, L, base, headX, tail0, cycles, D, S, cyc: .95, gRest: (1 - restRatio) * A / S, neckRest: .3 };
    this.hero = { t: 0 }; this.mode = 'hero'; this.bf = null; this.foods = []; this.speed = 0; this.wig = 0;
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
    return { g: I.gRest * (s + br), anchor: 'head', ax: I.headX, lean: 0, neck: I.neckRest * s, tilt: .1 * s };
  }
  inchSegs() {
    const I = this.inch, st = this.inchState(), R = this.R, L = I.L, a = R * .45, b = R * 2.6, A = L - a - b;
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
    return out;
  }

  /* ---------- play ---------- */
  startPlay() {
    if (this.mode !== 'hero') this.buildHero(false);
    const segs = this.inchSegs();
    this.hatch = { t: 0, segs: segs.map(o => ({ ...o })), head: this.inchHead.slice(), x: this.W / 2, y: this.H * .5, popped: 0, sc: clamp(this.W / 390, .85, 1.3) };
    this.inch = null; this.hero = null; this.mode = 'hatch';
    this.dayI = -1; this.eaten = 0; this.elapsed = 0; this.timing = false; this.queue = 0; this.penalty = 0; this.points = 0; this.bonus = 0; this.bumps = 0; this.safeUntil = 0;
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
    const d = DAYS[this.dayI]; if (!d) return;
    this.pending = d.foods.slice(); this.spawn([this.pending.shift()]);
    if (this.dayI === 0) { this.timing = true; this.elapsed = 0; }
    this.hooks.onDay && this.hooks.onDay(this.dayI, d);
  }
  spawn(keys) {
    const m = 34 * this.fs, top = this.top + 20, bot = this.H - m - 96, r = this.rng, head = this.at(this.headS);
    const placed = [];
    keys.forEach((key, i) => {
      let best = null, bestD = -1;
      for (let k = 0; k < 160; k++) {
        const x = m + r() * (this.W - 2 * m), y = top + r() * (bot - top);
        const dh = Math.hypot(x - head[0], y - head[1]);
        let dmin = Infinity; placed.concat(this.foods).forEach(f => { dmin = Math.min(dmin, Math.hypot(x - f.x, y - f.y)); });
        const score = Math.min(dmin, 160) + (dh > 100 ? 40 : -200);
        if (score > bestD) { bestD = score; best = [x, y]; }
        if (dmin > 74 * this.fs && dh > 110) break;
      }
      const f = FOOD[key], sc = this.fs * (key === 'leaf' ? 1.25 : 1);
      const food = { key, x: best[0], y: best[1], w: f.w * sc, h: f.h * sc, born: this.t + i * .07, rot: (r() - .5) * .3, ph: r() * TAU, eaten: -1 };
      placed.push(food); this.foods.push(food);
    });
  }
  eat(f) {
    f.eaten = this.t; this.eaten++; this.n++; this.chomp = 1; this.points += 100;
    this.particles.push({ x: f.x, y: f.y - 18, vx: 0, vy: -46, r: 0, txt: '+100', good: 1, life: .9, age: 0, g: 0, drag: .4 });
    const col = FOOD[f.key].col;
    for (let i = 0; i < 9; i++) { const a = this.rng() * TAU, v = 50 + this.rng() * 90; this.particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: 2 + this.rng() * 3, col, life: .55 + this.rng() * .3, age: 0, g: 260 }); }
    if (this.pending && this.pending.length) this.spawnAt = this.t + .28;
    const left = this.foods.filter(o => o.eaten < 0).length + (this.pending ? this.pending.length : 0);
    this.hooks.onEat && this.hooks.onEat(f.key, left, this.dayI);
    if (left === 0) {
      if (this.dayI === 5) { this.queue = 2.2; this.ache = this.t; this.hooks.onAche && this.hooks.onAche(); }
      else if (this.dayI === 6) { this.timing = false; this.bonus = Math.max(0, Math.round(90 - this.elapsed)) * 10; this.points += this.bonus; this.hooks.onFinish && this.hooks.onFinish(this.points, this.bumps, this.bonus); this.queue = -1; setTimeout(() => this.startTransform(), 1700); }
      else this.queue = .75;
    }
  }
  steer(dt) {
    const head = this.at(this.headS); let want = null;
    if (this.input.down) want = [this.input.x, this.input.y];
    else if (Object.keys(this.keys).length) { const k = this.keys; const kx = (k.R ? 1 : 0) - (k.L ? 1 : 0), ky = (k.D ? 1 : 0) - (k.U ? 1 : 0); if (kx || ky) want = [head[0] + kx * 200, head[1] + ky * 200]; }
    else if (this.auto) { let best = null, bd = 1e9; this.foods.forEach(f => { if (f.eaten >= 0) return; const d = Math.hypot(f.x - head[0], f.y - head[1]); if (d < bd) { bd = d; best = f; } }); if (best) want = [best.x, best.y]; }
    let turn = 4.4;
    if (want) { const dx = want[0] - head[0], dy = want[1] - head[1]; if (Math.hypot(dx, dy) > this.R * .8) this.dir += clamp(angDiff(this.dir, Math.atan2(dy, dx)), -turn * dt, turn * dt); }
    // keep inside the page
    const look = this.R * 3.2, lx = head[0] + Math.cos(this.dir) * look, ly = head[1] + Math.sin(this.dir) * look, m = this.R + 8;
    if (lx < m || lx > this.W - m || ly < this.top || ly > this.H - m) { const c = Math.atan2(this.H * .55 - head[1], this.W / 2 - head[0]); this.dir += clamp(angDiff(this.dir, c), -turn * 1.3 * dt, turn * 1.3 * dt); }
  }

  /* ---------- metamorphosis ---------- */
  startTransform() {
    const segs = this.segPositions();
    const pts = segs.concat([{ x: this.at(this.headS)[0], y: this.at(this.headS)[1] }]), mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    this.tf = { t: 0, segs: segs.map(s => ({ ...s })), head: this.at(this.headS), cx: clamp(mx, this.W * .3, this.W * .7), cy: clamp(my, this.H * .3, this.H * .6) };
    this.mode = 'transform'; this.foods = [];
    this.hooks.onTransform && this.hooks.onTransform();
  }
  restPose() { const g = this.glyph; return { x: g.x + g.w * .5, y: g.y + g.h * .02, w: Math.min(this.W * .5, 215), tilt: -.08 }; }
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
      else { const target = 13 + 5 * this.eaten / CP.TOTAL_FOODS; this.R = lerp(this.R, target, 1 - Math.exp(-dt * 4)); }
      if (this.queue > 0) { this.queue -= dt; if (this.queue <= 0) this.nextDay(); }
      if (this.spawnAt && t > this.spawnAt) { this.spawnAt = 0; this.spawn([this.pending.shift()]); this.hooks.onSpawn && this.hooks.onSpawn(); }
      if (this.timing) this.elapsed += dt;
      const aching = this.ache && t - this.ache < 2;
      this.speed = 128 * this.fs * (aching ? .35 : 1) * (sh && sh.t < 1 ? .2 + .8 * ease.inOut(sh.t) : 1);
      this.steer(dt);
      if (aching) this.dir += Math.sin(t * 9) * dt * 2;
      const h = this.at(this.headS); this.push(h[0] + Math.cos(this.dir) * this.speed * dt, h[1] + Math.sin(this.dir) * this.speed * dt); this.headS = this.cum[this.cum.length - 1];
      this.phase += this.speed * dt / (this.R * 2.4) * TAU;
      const hh = this.at(this.headS);
      if (this.timing && t > this.safeUntil) this.checkBump(hh);
      this.near = 0;
      this.foods.forEach(f => { if (f.eaten >= 0 || t < f.born) return; const d = Math.hypot(f.x - hh[0], f.y - hh[1]); if (d < 70) this.near = 1; if (d < this.R * 1.3 + 16 * this.fs) this.eat(f); });
      this.foods = this.foods.filter(f => f.eaten < 0 || t - f.eaten < .9);
    } else if (this.mode === 'transform') this.stepTransform(dt);
    else if (this.mode === 'rest') this.stepButterfly(dt);
    else if (this.mode === 'leave') { this.lv.t += dt; if (this.lv.t > 4.2) this.buildHero(true); }
    if (this._m !== this.mode) { this._m = this.mode; this.card.classList.toggle('behind', this.mode === 'hero'); }
    this.nShow = lerp(this.nShow, this.n, 1 - Math.exp(-dt * 6));
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
      f.path = [[f.cx, f.cy], [f.cx, f.cy], [this.W * .78, this.H * .3], [this.W * .22, this.H * .2], [r.x + 30, r.y - 40], [r.x, r.y], [r.x, r.y]];
    }
    if (t > 8.4 && !f.done) { f.done = 1; this.setRest(); this.bf.burst = .4; this.hooks.onTransformDone && this.hooks.onTransformDone(); }
  }
  confetti(x, y, n) {
    const tex = ['apple', 'orange', 'bfyellow', 'blue', 'bfpurple', 'bflime', 'pink', 'teal', 'strawberry'];
    for (let i = 0; i < n; i++) { const a = -PI / 2 + (this.rng() - .5) * PI * 1.6, v = 160 + this.rng() * 340; this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + this.rng() * 4.5, tex: tex[i % tex.length], life: 2.2 + this.rng() * 1.6, age: 0, g: 330, drag: .18, a: this.rng() * TAU, spin: (this.rng() - .5) * 14 }); }
  }

  /* ---------- body geometry ---------- */
  segPositions() {
    if (this.mode === 'hero' && this.inch) return this.inchSegs();
    const R = this.R, gap = R * .9, base = R * .97, out = [], amp = clamp(Math.abs(this.speed) / 60, 0, 1) * (this.mode === 'hero' ? .2 : .13), wig = this.wig;
    const N = Math.ceil(this.nShow);
    let d = gap;
    for (let k = 0; k < N; k++) {
      const w = Math.sin(this.phase - k * .8), w2 = Math.sin(this.t * 2.2 - k * .55);
      if (k) d += base * (1 + amp * w + wig * .18 * Math.sin(this.t * 14 - k));
      const s = this.headS - d, p = this.at(s), q = this.at(s + R * .5);
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const lift = R * (amp * .9 * Math.max(0, w) + .03 * w2 + wig * .12 * Math.max(0, Math.sin(this.t * 14 - k)));
      const frac = k === N - 1 ? clamp(this.nShow - k, .15, 1) : 1;
      const r = R * (1 + .03 * w2 + amp * .25 * w) * frac * this.taper(k, N);
      out.push({ x: p[0], y: p[1] - lift, a, r, k, w });
    }
    return out;
  }

  /* ---------- drawing ---------- */
  draw() {
    const g = this.g; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, this.W, this.H);
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
  score() { return this.points; }
  // bumping into his own body costs time instead of ending the game
  checkBump(h) {
    const segs = this.segPositions();
    for (let i = 4; i < segs.length; i++) {
      const sg = segs[i]; if (Math.hypot(sg.x - h[0], sg.y - h[1]) > this.R * 1.15) continue;
      this.bumps++; this.points = Math.max(0, this.points - 50); this.safeUntil = this.t + 1.2; this.wig = 1;
      this.dir = Math.atan2(h[1] - sg.y, h[0] - sg.x);
      this.particles.push({ x: h[0], y: h[1] - this.R * 2, vx: 0, vy: -40, r: 0, txt: '−50', life: 1.1, age: 0, g: 0, drag: .4 });
      this.hooks.onBump && this.hooks.onBump(this.bumps);
      return;
    }
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
      if (f.eaten >= 0) { const e = t - f.eaten; img = F.eaten; sc = 1 + .12 * Math.sin(clamp(e / .18, 0, 1) * PI); alpha = 1 - clamp((e - .35) / .5, 0, 1); sc *= 1 - .25 * clamp((e - .35) / .5, 0, 1); }
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
    const R = this.R, list = SEG.list, S = (SEG.R + SEG.pad) * 2;
    g.save(); g.globalAlpha = alpha;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], sc = s.r / SEG.R;
      // feet behind the body on the downward side
      const nx = -Math.sin(s.a), ny = Math.cos(s.a), sg = ny >= 0 ? 1 : -1, fy = ny * sg;
      const onGround = s.ground !== undefined ? s.ground : fy > .3 && i % 2 === 0;
      if (onGround) for (const off of [-.28, .28]) {
        const step = Math.sin(this.phase - i * .8 + 1.2 + off * 4), fx = nx * sg, len = s.r * (.9 - .05 * Math.max(0, step));
        g.save(); g.translate(s.x + fx * len + Math.cos(s.a) * s.r * (off + step * .06), s.y + fy * len + Math.sin(s.a) * s.r * (off + step * .06));
        g.rotate(Math.atan2(fy, fx) - PI / 2); g.scale(sc * .42, sc * .5); g.drawImage(SEG.foot, -7, -5, 14, 16); g.restore();
      }
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
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
    if (t < 2.7) {
      const segs = f.segs.map((s0, k) => {
        const e = ease.inOut(clamp((t - .05 - (1 - k / N) * .45) / 1.05, 0, 1)), ty = yH - (k + 1) / N * (yH - y0 - rt * .3), tx = f.cx + Math.sin(k * .7) * 1.2 * sz;
        return { ...s0, x: lerp(s0.x, tx, e), y: lerp(s0.y, ty, e) - Math.sin(PI * e) * 18, a: s0.a + angDiff(s0.a, PI / 2) * e, r: lerp(s0.r, rt * (k > N - 4 ? .9 : 1), e) };
      });
      const eh = ease.inOut(clamp((t - .5) / 1.05, 0, 1));
      this.R = lerp(f.R0, rt * .95, eh);
      this.drawCaterpillar(g, segs, 1, [lerp(f.head[0], f.cx, eh), lerp(f.head[1], yH + rt * .2, eh) - Math.sin(PI * eh) * 18]);
    }
    // 2. he spins his little house around himself: the cocoon wraps him from the twig down, sways, then splits
    if (t > .7 && t < 4.35) {
      const edge = t < 1.3 ? lerp(-26, 2, ease.out(clamp((t - .7) / .55, 0, 1))) : lerp(2, 112, ease.inOut(clamp((t - 1.35) / 1.3, 0, 1)));
      let rot = 0; if (t > 2.6 && t < 3.8) { const w = (t - 2.6) / 1.2; rot = Math.sin(w * PI * 6) * .07 * Math.sin(w * PI); }
      const out = clamp((t - 3.85) / .5, 0, 1), sc = sz * (1 + out * .12);
      g.save(); g.globalAlpha = 1 - out; g.translate(f.cx, top - 18 * sz); g.rotate(rot); g.translate(0, 18 * sz); g.scale(sc, sc);
      const clip = new Path2D(); clip.moveTo(-40, -30); clip.lineTo(40, -30);
      for (let x = 40; x >= -40; x -= 4) clip.lineTo(x, edge + Math.sin(x * .22 + t * 7) * 2.6);
      clip.closePath(); g.clip(clip);
      g.drawImage(co.img, -co.w / 2, -22, co.w, co.h); g.restore();
    }
    // 3. butterfly unfolds and flies to the "1"
    if (t > 3.85) {
      const u = clamp((t - 3.85) / 1.05, 0, 1), restW = Math.min(this.W * .5, 215);
      let x = f.cx, y = f.cy + 6, w = restW * (.55 + .45 * ease.out(u)), flap = u < 1 ? this.flapX(PI * (1 - ease.out(u))) : 1, tilt = 0;
      if (f.path && t > 4.8) {
        const v = clamp((t - 4.8) / 3.5, 0, 1), e = ease.inOut(v), P = f.path, seg = P.length - 3, q = Math.min(seg - 1e-6, e * seg), i = Math.floor(q), l = q - i;
        const cr = (a, b, c, d) => .5 * (2 * b + (-a + c) * l + (2 * a - 5 * b + 4 * c - d) * l * l + (-a + 3 * b - 3 * c + d) * l * l * l);
        const nx = cr(P[i][0], P[i + 1][0], P[i + 2][0], P[i + 3][0]), ny = cr(P[i][1], P[i + 1][1], P[i + 2][1], P[i + 3][1]);
        tilt = clamp((nx - (f.px ?? nx)) * .02, -.35, .35) + f.rest.tilt * e; f.px = nx;
        x = nx; y = ny + Math.sin(v * PI * 6) * 8 * (1 - e); w = restW;
        const fl = (t - 4.8) * TAU * 3.1 * (1 - .55 * e); flap = this.flapX(fl);
        if (v > .94) flap = lerp(flap, 1, (v - .94) / .06);
      }
      CP.drawButterfly(g, x, y, w, flap, tilt);
    }
  }
}
CP.Game = Game;
})();
