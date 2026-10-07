/* Art: assets, painted-paper helpers, sprites (caterpillar, foods, cocoon, butterfly) */
(() => {
'use strict';
const CP = window.CP = {};
const DPR = CP.DPR = Math.min(2.5, window.devicePixelRatio || 1);
const TAU = CP.TAU = Math.PI * 2, PI = Math.PI;
CP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
CP.lerp = (a, b, t) => a + (b - a) * t;
CP.ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  sine: t => .5 - .5 * Math.cos(PI * t),
};
CP.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const rng = CP.rng = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

const IMG = CP.IMG = {};
const TEX = ['green','teal','red','redone','orange','yellow','plum','apple','pear','leaf','bfblue','bfpurple','bflime','bfyellow','strawberry','brown','choc','pink','cream','tan','pickle','blue','navy','violet','salami','lgreen'];
const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Missing ' + src)); i.src = src; });
CP.loadAll = async () => {
  const list = [['head','assets/cat_head.png'],['seg','assets/segments.jpg'],['apple','assets/f_apple.png'],['pear','assets/f_pear.png'],['plum','assets/f_plum.png'],['strawberry','assets/f_strawberry.png'],['orange','assets/f_orange.png'],['bfL','assets/bf_left.png'],['bfR','assets/bf_right.png'],['bfB','assets/bf_body.png']];
  TEX.forEach(n => list.push(['t_' + n, 'assets/tex/' + n + '.jpg']));
  await Promise.all(list.map(async ([k, s]) => { IMG[k] = await load(s); }));
  if (IMG.head.decode) await Promise.all(Object.values(IMG).map(i => i.decode().catch(() => {})));
};

const canvas = CP.canvas = (w, h, s = DPR) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * s); c.height = Math.ceil(h * s); const g = c.getContext('2d'); g.scale(s, s); c.cw = w; c.ch = h; return [c, g]; };
const pat = CP.pat = (g, name, scale = .42, rot = 0, ox = 0, oy = 0) => {
  const p = g.createPattern(IMG['t_' + name], 'repeat');
  p.setTransform(new DOMMatrix().translateSelf(ox, oy).rotateSelf(rot).scaleSelf(scale));
  return p;
};
const smooth = pts => { const p = new Path2D(), n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const a = pts[i], c = m(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], c[0], c[1]); } p.closePath(); return p; };
const wob = CP.wob = (cx, cy, rx, ry, seed, amt = .04, rot = 0, n = 30) => {
  const r = rng(seed), p1 = r() * TAU, p2 = r() * TAU, pts = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + amt * (Math.sin(a * 2 + p1) * .5 + Math.sin(a * 3 + p2) * .5) + (r() - .5) * amt * .5, x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
  return smooth(pts);
};
const poly = CP.poly = (pts, seed = 1, j = .6) => { const r = rng(seed), p = new Path2D(); pts.forEach(([x, y], i) => { x += (r() - .5) * j; y += (r() - .5) * j; i ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; };
// cut painted paper: shadowed fill + faint inner edge
const paper = CP.paper = (g, path, tex, o = {}) => {
  const sc = o.k || DPR;
  g.save();
  if (o.shadow !== false) { g.shadowColor = o.sc || 'rgba(70,40,5,.26)'; g.shadowBlur = (o.sb ?? 2.2) * sc; g.shadowOffsetX = (o.sx ?? 0) * sc; g.shadowOffsetY = (o.sy ?? 1.1) * sc; }
  g.fillStyle = pat(g, tex, o.scale ?? .42, o.rot ?? 0, o.ox ?? 0, o.oy ?? 0);
  g.fill(path); g.restore();
  if (o.edge !== false) { g.save(); g.clip(path); g.lineWidth = o.ew ?? 1.4; g.strokeStyle = o.ec || 'rgba(30,15,0,.15)'; g.stroke(path); g.restore(); }
};

/* ---------- caterpillar ---------- */
const SEG = CP.SEG = { R: 20, pad: 14, k: 3, list: [] };
CP.buildSegments = () => {
  const n = Math.floor(IMG.seg.width / 52), R = SEG.R, S = (R + SEG.pad) * 2, k = SEG.k;
  const order = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].slice(0, n);
  SEG.list = order.map(i => {
    const [c, g] = canvas(S, S, k); g.translate(S / 2, S / 2);
    const r = rng(101 + i), rx = R * .6, ry = R;
    const cols = ['#f4c430','#f8dc52','#5aa9e6','#e8452a','#f39a1e','#a6d84e','#86ccf2','#f4c430'];
    g.lineCap = 'round';
    // fur only along the back (local -y), wrapping a little over each end like the book
    for (let h = 0; h < 95; h++) {
      const a = PI + (r() * 1.3 - .15) * PI, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      let nx = Math.cos(a) / rx, ny = Math.sin(a) / ry; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      const j = (r() - .5) * .7, vx = nx * Math.cos(j) - ny * Math.sin(j), vy = nx * Math.sin(j) + ny * Math.cos(j), len = 2 + r() * 5.5;
      g.strokeStyle = cols[(r() * cols.length) | 0]; g.globalAlpha = .5 + r() * .45; g.lineWidth = .35 + r() * .45;
      g.beginPath(); g.moveTo(ex * .95, ey * .95); g.lineTo(ex + vx * len, ey + vy * len); g.stroke();
    }
    g.globalAlpha = 1;
    const p = wob(0, 0, rx, ry, 300 + i, .05);
    // soft yellow halo like the book's glued edge
    g.save(); g.shadowColor = 'rgba(240,210,60,.55)'; g.shadowBlur = 2.5 * k; g.fillStyle = '#2f7d34'; g.fill(p); g.restore();
    // shadow falls toward the tail (local -x)
    g.save(); g.shadowColor = 'rgba(8,40,12,.42)'; g.shadowBlur = 3.5 * k; g.shadowOffsetX = -2.2 * k; g.shadowOffsetY = .8 * k; g.fillStyle = '#2f7d34'; g.fill(p); g.restore();
    g.save(); g.clip(p); g.rotate((r() - .5) * .8 + (r() < .5 ? PI / 2 : 0));
    const sz = ry * 2.3; g.drawImage(IMG.seg, i * 52 + 1, 1, 50, 50, -sz / 2, -sz / 2, sz, sz); g.restore();
    g.save(); g.clip(p);
    const gr = g.createRadialGradient(-rx * .2, -ry * .35, 1, 0, 0, ry * 1.05);
    gr.addColorStop(0, 'rgba(255,255,220,.12)'); gr.addColorStop(.62, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,30,10,.3)');
    g.fillStyle = gr; g.fillRect(-S, -S, S * 2, S * 2);
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(0,30,10,.25)'; g.stroke(p); g.restore();
    return c;
  });
  // feet: little brown cut-paper feet
  const [fc, fg] = canvas(14, 16, 4); fg.translate(7, 6);
  const fp = new Path2D(); fp.moveTo(-3.4, -5); fp.lineTo(3.4, -5); fp.lineTo(3.8, 3.5); fp.quadraticCurveTo(4.2, 6.5, 0, 6.6); fp.lineTo(-3.6, 6.4); fp.quadraticCurveTo(-4.6, 5.5, -3.8, 3.4); fp.closePath();
  paper(fg, fp, 'brown', { k: 4, scale: .3, sb: 1.2, sy: .6 });
  SEG.foot = fc;
};

/* ---------- foods ---------- */
const FOOD = CP.FOOD = {};
const imgFood = (key, h, col, hole) => { FOOD[key] = { img: IMG[key], w: IMG[key].width * h / IMG[key].height, h, col, hole }; };
const drawFood = (key, w, h, col, fn, hole = [0, 2], res = 3) => {
  const pad = 6, [c, g] = canvas(w + pad * 2, h + pad * 2, res); g.translate(w / 2 + pad, h / 2 + pad); g.scale(w / 56, h / 56);
  fn(g, res); FOOD[key] = { img: c, w: w + pad * 2, h: h + pad * 2, col, hole, res };
};
const line = (g, pts, w, col, cap = 'round') => { g.save(); g.lineWidth = w; g.lineCap = cap; g.lineJoin = 'round'; g.strokeStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); };
const leafPath = (x, y, len, wid, rot) => { const p = new Path2D(), c = Math.cos(rot), s = Math.sin(rot), T = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const a = T(0, 0), b1 = T(len * .3, -wid), b2 = T(len * .75, -wid * .8), e = T(len, 0), d1 = T(len * .75, wid * .8), d2 = T(len * .3, wid);
  p.moveTo(...a); p.bezierCurveTo(...b1, ...b2, ...e); p.bezierCurveTo(...d1, ...d2, ...a); p.closePath(); return p; };
CP.buildFoods = () => {
  imgFood('apple', 50, '#d9301e', null); imgFood('pear', 56, '#7fa83a', null); imgFood('plum', 44, '#4b3a9a', [0, 4]);
  imgFood('strawberry', 46, '#d8261f', [0, 6]); imgFood('orange', 46, '#f08a1c', [-2, 6]);
  drawFood('cake', 50, 46, '#5a3320', (g, k) => {
    const body = poly([[-24, 20], [24, 20], [24, -2], [-24, -12]], 3);
    paper(g, body, 'choc', { k, scale: .35 });
    g.save(); g.clip(body);
    paper(g, poly([[-26, 2], [26, 8], [26, 13], [-26, 7]], 4), 'cream', { k, scale: .4, sb: 1 });
    paper(g, poly([[-26, -16], [26, -6], [26, 1], [-26, -8]], 5), 'pink', { k, scale: .4, sb: 1 });
    g.restore();
    paper(g, wob(-4, -16, 6, 6, 6), 'apple', { k, scale: .3 });
    line(g, [[-4, -21], [0, -28]], 1.6, '#4c6b1e');
  }, [6, 10]);
  drawFood('icecream', 40, 54, '#f07aa8', (g, k) => {
    const cone = poly([[-13, -2], [13, -2], [0, 27]], 7);
    paper(g, cone, 'tan', { k, scale: .3 });
    g.save(); g.clip(cone); g.strokeStyle = 'rgba(120,70,20,.45)'; g.lineWidth = 1.2;
    for (let i = -30; i < 30; i += 6) { g.beginPath(); g.moveTo(i, -4); g.lineTo(i + 30, 30); g.moveTo(i, -4); g.lineTo(i - 30, 30); g.stroke(); }
    g.restore();
    paper(g, wob(0, -12, 16, 13, 8, .07), 'pink', { k, scale: .35 });
    [[-10, -1, 3.6], [-3, 0, 3], [5, -1, 3.8], [11, -2, 2.6]].forEach(([x, y, r], i) => paper(g, wob(x, y, r, r * 1.2, 9 + i), 'pink', { k, scale: .35, shadow: false, edge: false }));
  }, [0, -12]);
  drawFood('pickle', 54, 34, '#5e8a2a', (g, k) => {
    const p = wob(0, 0, 26, 10.5, 10, .06, -.42);
    paper(g, p, 'pickle', { k, scale: .3 });
    g.save(); g.clip(p); const r = rng(11);
    for (let i = 0; i < 16; i++) { const t = (r() - .5) * 44, v = (r() - .5) * 12; const x = t * Math.cos(-.42) - v * Math.sin(-.42), y = t * Math.sin(-.42) + v * Math.cos(-.42); paper(g, wob(x, y, 1.8, 1.5, 20 + i), 'lgreen', { k, shadow: false, edge: false, scale: .3 }); }
    g.restore();
  }, [4, 0]);
  drawFood('cheese', 52, 42, '#f2c230', (g, k) => {
    const p = poly([[-26, 18], [26, 18], [22, -18]], 12);
    paper(g, p, 'bfyellow', { k, scale: .5 });
    g.save(); g.clip(p);
    [[8, 4, 4.5], [16, -8, 3], [-8, 12, 3.5], [14, 13, 2.4], [2, 15, 2]].forEach(([x, y, r], i) => paper(g, wob(x, y, r, r * .9, 30 + i), 'tan', { k, scale: .3, sc: 'rgba(120,70,0,.35)', sy: -.8 }));
    g.restore();
  }, [-6, 10]);
  drawFood('salami', 46, 46, '#b52a34', (g, k) => {
    const p = wob(0, 0, 22, 22, 13, .04);
    paper(g, p, 'salami', { k, scale: .35 });
    g.save(); g.clip(p); g.lineWidth = 5; g.strokeStyle = 'rgba(110,15,25,.75)'; g.stroke(p);
    const r = rng(14); for (let i = 0; i < 18; i++) { const a = r() * TAU, d = r() * 15; paper(g, wob(Math.cos(a) * d, Math.sin(a) * d, 1.4 + r() * 1.6, 1.2 + r() * 1.2, 40 + i, .2), 'cream', { k, shadow: false, edge: false }); }
    g.restore();
  }, [-7, -5]);
  drawFood('lollipop', 40, 56, '#e8452a', (g, k) => {
    paper(g, poly([[-1.8, 4], [1.8, 4], [1.8, 28], [-1.8, 28]], 15, .2), 'cream', { k, scale: .3 });
    [[17, 'apple'], [13, 'bfyellow'], [9.2, 'blue'], [5.4, 'bflime']].forEach(([r, t], i) => paper(g, wob(0, -9, r, r, 50 + i, .03), t, { k, scale: .35, sb: i ? 1 : 2.2 }));
  }, [0, -9]);
  drawFood('pie', 50, 50, '#c0182a', (g, k) => {
    const crust = new Path2D(); crust.moveTo(0, 26); crust.lineTo(-23, -12); crust.quadraticCurveTo(0, -26, 23, -12); crust.closePath();
    paper(g, crust, 'tan', { k, scale: .35 });
    const fill = new Path2D(); fill.moveTo(0, 18); fill.lineTo(-15, -7); fill.quadraticCurveTo(0, -16, 15, -7); fill.closePath();
    paper(g, fill, 'strawberry', { k, scale: .35, sy: -.6 });
    g.save(); g.clip(fill); [[-14, -2, 10, 10], [-8, -14, 16, 6]].forEach(() => {});
    for (let i = -2; i <= 2; i++) paper(g, poly([[i * 7 - 2, -20], [i * 7 + 2, -20], [i * 7 + 2, 24], [i * 7 - 2, 24]], 60 + i, .4), 'tan', { k, scale: .3, sb: 1.2 });
    g.restore();
  }, [-4, 2]);
  drawFood('sausage', 54, 30, '#9b3a22', (g, k) => {
    const p = wob(0, 0, 25, 9.5, 16, .03, .32);
    paper(g, p, 'salami', { k, scale: .3 });
    g.save(); g.clip(p); g.fillStyle = 'rgba(80,30,5,.35)'; g.fill(p); g.restore();
    line(g, [[-15, -9], [8, -1.5]], 2, 'rgba(255,230,210,.45)');
    paper(g, wob(-26, -8.5, 3, 2.4, 17), 'brown', { k }); paper(g, wob(26, 8.5, 3, 2.4, 18), 'brown', { k });
  }, [3, 1]);
  drawFood('cupcake', 46, 54, '#f07aa8', (g, k) => {
    const liner = poly([[-16, 2], [16, 2], [12, 26], [-12, 26]], 19);
    paper(g, liner, 'blue', { k, scale: .35 });
    g.save(); g.clip(liner); for (let i = -14; i <= 14; i += 4) line(g, [[i, 2], [i * .75, 26]], 1, 'rgba(10,30,90,.35)'); g.restore();
    [[-9, -1, 10, 8], [9, -1, 10, 8], [0, -9, 11, 9]].forEach(([x, y, rx, ry], i) => paper(g, wob(x, y, rx, ry, 70 + i, .06), 'pink', { k, scale: .35 }));
    paper(g, wob(0, -19, 5, 5, 74), 'apple', { k, scale: .3 });
  }, [0, -4]);
  drawFood('watermelon', 54, 34, '#e8452a', (g, k) => {
    const semi = r => { const p = new Path2D(); p.moveTo(-r, -9); p.arc(0, -9, r, 0, PI, false); p.closePath(); return p; };
    paper(g, semi(26), 'leaf', { k, scale: .35 });
    paper(g, semi(22.5), 'cream', { k, scale: .35, shadow: false });
    paper(g, semi(20.5), 'apple', { k, scale: .35, shadow: false });
    [[-10, -3], [-4, 2], [3, -2], [9, 3], [13, -4], [-14, -6], [0, 8]].forEach(([x, y], i) => { g.save(); g.translate(x, y); g.rotate(-.3 + i * .1); g.fillStyle = '#231a14'; g.beginPath(); g.ellipse(0, 0, 1.3, 2.1, 0, 0, TAU); g.fill(); g.restore(); });
  }, [-4, -5]);
  drawFood('leaf', 64, 50, '#3f9a35', (g, k) => {
    const p = leafPath(-27, 14, 60, 15, -.5);
    paper(g, p, 'leaf', { k, scale: .3 });
    g.save(); g.clip(p);
    const mid = [[-27, 14], [-5, 3], [20, -9], [27, -13]]; line(g, mid, 1.4, 'rgba(230,240,150,.6)');
    for (let i = 0; i < 6; i++) { const t = -22 + i * 8; const y = 14 - (t + 27) * .48; line(g, [[t, y], [t + 7, y - 9]], .9, 'rgba(230,240,150,.45)'); line(g, [[t, y], [t + 10, y + 3]], .9, 'rgba(230,240,150,.45)'); }
    g.restore();
    line(g, [[-27, 14], [-31, 18]], 2, '#6b4a1e');
  }, [4, -2], 9); // shown ~3x bigger than other food on Sunday, so draw it sharper
  // eaten versions: punch the book's hole
  Object.entries(FOOD).forEach(([key, f]) => {
    if (!f.hole) { f.eaten = f.img; return; }
    const W = f.w, H = f.h, [c, g] = canvas(W, H, f.res || 3); g.drawImage(f.img, 0, 0, W, H);
    const hx = W / 2 + f.hole[0], hy = H / 2 + f.hole[1], hr = Math.min(W, H) * .1;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill(); g.restore();
    g.save(); g.globalCompositeOperation = 'source-atop'; g.lineWidth = 2.2; g.strokeStyle = 'rgba(70,25,0,.38)'; g.beginPath(); g.arc(hx, hy + .4, hr + 1, 0, TAU); g.stroke(); g.restore();
    f.eaten = c;
  });
};
CP.foodURL = key => { const f = FOOD[key]; if (f.url) return f.url; if (f.img instanceof HTMLImageElement) return (f.url = f.img.src); return (f.url = f.img.toDataURL('image/png')); };

/* ---------- cocoon ---------- */
CP.buildCocoon = () => {
  const W = 70, H = 120, [c, g] = canvas(W, H, 3); g.translate(W / 2, 22);
  line(g, [[0, -18], [0, 2]], 1.4, '#6b4a1e');
  paper(g, poly([[-26, -20], [26, -16], [26, -12], [-26, -16]], 80, .4), 'brown', { k: 3, scale: .3 });
  paper(g, leafPath(14, -16, 20, 6, -.35), 'leaf', { k: 3, scale: .35 });
  const p = wob(0, 42, 21, 42, 81, .06);
  paper(g, p, 'brown', { k: 3, scale: .4 });
  g.save(); g.clip(p); const r = rng(82);
  for (let i = 0; i < 14; i++) { const y = 4 + i * 6.2; g.strokeStyle = r() < .5 ? 'rgba(220,170,100,.55)' : 'rgba(60,30,10,.4)'; g.lineWidth = 1 + r() * 1.6; g.beginPath(); g.moveTo(-24, y + r() * 4); g.quadraticCurveTo(0, y - 6 + r() * 4, 24, y + 2 + r() * 6); g.stroke(); }
  g.restore();
  CP.cocoon = { img: c, w: W, h: H, ax: W / 2, ay: 22 + 42 };
};

/* ---------- the little egg on a leaf ---------- */
CP.buildEgg = () => {
  const mk = (W, H, fn) => { const [c, g] = canvas(W, H, 3); g.translate(W / 2, H / 2); fn(g); return { img: c, w: W, h: H }; };
  const leaf = mk(230, 130, g => {
    const p = leafPath(-104, 22, 212, 46, -.2);
    paper(g, p, 'leaf', { k: 3, scale: .34, sb: 3, sy: 2 });
    g.save(); g.clip(p);
    paper(g, leafPath(-60, 30, 150, 22, -.32), 'lgreen', { k: 3, scale: .34, shadow: false, edge: false });
    g.globalAlpha = .9; paper(g, leafPath(-104, 22, 212, 46, -.2), 'leaf', { k: 3, scale: .34, shadow: false, edge: false, rot: 30, ox: 40 });
    g.globalAlpha = 1;
    const mid = [[-104, 22], [-40, 9], [30, -6], [107, -21]]; line(g, mid, 2.2, 'rgba(225,240,150,.65)');
    for (let i = 0; i < 9; i++) { const u = -88 + i * 21, y = 22 - (u + 104) * .2; line(g, [[u, y], [u + 18, y - 26]], 1.3, 'rgba(225,240,150,.45)'); line(g, [[u, y], [u + 22, y + 18]], 1.3, 'rgba(225,240,150,.45)'); }
    g.restore();
    line(g, [[-104, 22], [-112, 30]], 3, '#6b4a1e');
  });
  const shape = wob(0, 0, 11, 14, 91, .03), crack = [[-13, 1], [-8, -3], [-4, 2], [0, -4], [4, 1], [8, -3], [13, 2]];
  const half = top => { const p = new Path2D(); p.moveTo(-14, top ? -20 : 20); crack.forEach(([x, y]) => p.lineTo(x, y)); p.lineTo(14, top ? -20 : 20); p.closePath(); return p; };
  const eggPart = clip => mk(34, 40, g => { if (clip) g.clip(clip); paper(g, shape, 'cream', { k: 3, scale: .3, sb: 2, sy: 1.4 });
    g.save(); g.clip(shape); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-4, -6, 3, 5, -.4, 0, TAU); g.fill(); g.restore(); });
  CP.egg = { leaf, whole: eggPart(null), top: eggPart(half(true)), bot: eggPart(half(false)) };
};

/* ---------- head + butterfly drawing ---------- */
const HEAD = CP.HEAD = { cx: 44, cy: 142, r: 66, eyes: [[27, 127, 13, 19], [59, 133, 13, 18]] };
CP.drawHead = (g, x, y, R, face, tilt, pulse, blink, look) => {
  const s = R * 1.3 / HEAD.r;
  g.save(); g.translate(x, y); g.rotate(tilt); g.scale(face * s * (1 + pulse), s * (1 + pulse * .55));
  g.drawImage(IMG.head, -HEAD.cx, -HEAD.cy);
  if (blink > 0) {
    g.fillStyle = pat(g, 'red', .5);
    HEAD.eyes.forEach(([ex, ey, rx, ry]) => { g.save(); g.beginPath(); g.ellipse(ex - HEAD.cx, ey - HEAD.cy, rx + 1.5, ry + 1.5, 0, 0, TAU); g.clip(); g.fillRect(ex - HEAD.cx - rx - 2, ey - HEAD.cy - ry - 2, rx * 2 + 4, (ry * 2 + 4) * blink); g.restore(); });
  }
  g.restore();
};
const BF = CP.BF = { px: 448, py: 200, w: 880 };
CP.drawButterfly = (g, x, y, width, flap, tilt, alpha = 1) => {
  const s = width / BF.w;
  g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(tilt); g.scale(s, s);
  const fx = Math.max(.04, flap), sy = 1 - (1 - fx) * .05;
  g.save(); g.scale(fx, sy); g.drawImage(IMG.bfL, -BF.px, -BF.py); g.restore();
  g.save(); g.scale(fx, sy); g.drawImage(IMG.bfR, -6, -BF.py); g.restore();
  g.drawImage(IMG.bfB, 373 - BF.px, 76 - BF.py);
  g.restore();
};
})();
